import Foundation

struct SupabaseRequest: Sendable {
    let path: String
    let method: String
    let body: Data?

    init(path: String, method: String = "GET", body: Data? = nil) {
        self.path = path
        self.method = method
        self.body = body
    }
}

protocol SupabaseTransporting {
    func send(request: SupabaseRequest) async throws -> (Data, HTTPURLResponse)
}

struct URLSessionSupabaseTransport: SupabaseTransporting {
    private let config: SupabaseConfiguration
    private let session: URLSession

    init(config: SupabaseConfiguration, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    func send(request: SupabaseRequest) async throws -> (Data, HTTPURLResponse) {
        let baseURL = config.url.appendingPathComponent("rest/v1")
        let requestURL = baseURL.appendingPathComponent(request.path)

        var urlRequest = URLRequest(url: requestURL)
        urlRequest.httpMethod = request.method
        urlRequest.httpBody = request.body
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        urlRequest.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        return (data, httpResponse)
    }
}

protocol SupabaseClientProviding {
    func execute<Response: Decodable>(_ request: SupabaseRequest, as responseType: Response.Type) async throws -> Response
}

struct UnconfiguredSupabaseClient: SupabaseClientProviding {
    func execute<Response: Decodable>(_ request: SupabaseRequest, as responseType: Response.Type) async throws -> Response {
        throw APIError.configuration
    }
}

struct SupabaseClient: SupabaseClientProviding {
    private let transport: SupabaseTransporting
    private let decoder: JSONDecoder

    init(transport: SupabaseTransporting, decoder: JSONDecoder = JSONDecoder()) {
        self.transport = transport
        self.decoder = decoder
    }

    func execute<Response: Decodable>(_ request: SupabaseRequest, as responseType: Response.Type) async throws -> Response {
        do {
            let (data, response) = try await transport.send(request: request)

            guard (200...299).contains(response.statusCode) else {
                throw APIErrorMapper.map(statusCode: response.statusCode)
            }

            return try decoder.decode(responseType, from: data)
        } catch {
            throw APIErrorMapper.map(error)
        }
    }
}
