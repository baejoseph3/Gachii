import Foundation

enum AppEnvironment: String, CaseIterable, Sendable {
    case development
    case staging
    case production
}

struct SupabaseConfiguration: Equatable, Sendable {
    let url: URL
    let anonKey: String
}

enum AppConfigurationError: Error, Equatable {
    case missingValue(key: String)
    case invalidURL(String)
    case invalidEnvironment(String)
}

protocol AppConfigProviding {
    var environment: AppEnvironment { get }
    var supabase: SupabaseConfiguration { get }
}

struct AppConfig: AppConfigProviding, Sendable {
    let environment: AppEnvironment
    let supabase: SupabaseConfiguration

    init(environment: AppEnvironment, supabase: SupabaseConfiguration) {
        self.environment = environment
        self.supabase = supabase
    }

    init(values: [String: String]) throws {
        let rawEnvironment = values["GACHII_ENV"] ?? AppEnvironment.development.rawValue
        guard let environment = AppEnvironment(rawValue: rawEnvironment) else {
            throw AppConfigurationError.invalidEnvironment(rawEnvironment)
        }

        let urlKey = "SUPABASE_URL_\(environment.rawValue.uppercased())"
        let anonKeyKey = "SUPABASE_ANON_KEY_\(environment.rawValue.uppercased())"

        guard let rawURL = values[urlKey], !rawURL.isEmpty else {
            throw AppConfigurationError.missingValue(key: urlKey)
        }

        guard let url = URL(string: rawURL) else {
            throw AppConfigurationError.invalidURL(rawURL)
        }

        guard let anonKey = values[anonKeyKey], !anonKey.isEmpty else {
            throw AppConfigurationError.missingValue(key: anonKeyKey)
        }

        self.environment = environment
        self.supabase = SupabaseConfiguration(url: url, anonKey: anonKey)
    }

    static func fromProcessInfo(_ processInfo: ProcessInfo = .processInfo) throws -> AppConfig {
        try AppConfig(values: processInfo.environment)
    }
}
