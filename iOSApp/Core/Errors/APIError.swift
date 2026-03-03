import Foundation

enum APIError: Error, Equatable, Sendable {
    case configuration
    case unauthorized
    case forbidden
    case notFound
    case conflict
    case rateLimited
    case serverError
    case decoding
    case network
    case unknown

    var userMessage: String {
        switch self {
        case .configuration:
            return "App configuration is incomplete. Please contact support."
        case .unauthorized:
            return "Your session has expired. Please sign in again."
        case .forbidden:
            return "You don't have permission to perform this action."
        case .notFound:
            return "We couldn't find what you were looking for."
        case .conflict:
            return "This data changed on another device. Please refresh and try again."
        case .rateLimited:
            return "You're doing that too often. Please wait a moment and retry."
        case .serverError, .network, .unknown:
            return "Something went wrong. Please try again."
        case .decoding:
            return "We couldn't process the response from the server."
        }
    }
}

struct APIErrorMapper {
    static func map(statusCode: Int) -> APIError {
        switch statusCode {
        case 401: return .unauthorized
        case 403: return .forbidden
        case 404: return .notFound
        case 409: return .conflict
        case 429: return .rateLimited
        case 500...599: return .serverError
        default: return .unknown
        }
    }

    static func map(_ error: Error) -> APIError {
        if let apiError = error as? APIError {
            return apiError
        }

        if error is AppConfigurationError {
            return .configuration
        }

        if error is DecodingError {
            return .decoding
        }

        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost, .timedOut:
                return .network
            default:
                return .unknown
            }
        }

        return .unknown
    }
}
