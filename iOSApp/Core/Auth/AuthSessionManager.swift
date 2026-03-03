import Foundation

protocol SupabaseAuthServicing {
    func refreshSession(using refreshToken: String) async throws -> SessionTokens
}

final class AuthSessionManager: AuthSessionProviding {
    private let tokenStore: SessionTokenStoring
    private let authService: SupabaseAuthServicing
    private var tokens: SessionTokens?

    var currentUserID: String? { tokens?.userID }
    var isAuthenticated: Bool { tokens != nil }

    init(tokenStore: SessionTokenStoring, authService: SupabaseAuthServicing) {
        self.tokenStore = tokenStore
        self.authService = authService
        self.tokens = try? tokenStore.load()
    }

    func refreshSession() async throws {
        guard let currentTokens = tokens else {
            throw APIError.unauthorized
        }

        let refreshed = try await authService.refreshSession(using: currentTokens.refreshToken)
        try tokenStore.save(refreshed)
        tokens = refreshed
    }

    func signOut() async throws {
        try tokenStore.clear()
        tokens = nil
    }

    func setSession(_ newTokens: SessionTokens) throws {
        try tokenStore.save(newTokens)
        tokens = newTokens
    }
}

struct StubSupabaseAuthService: SupabaseAuthServicing {
    func refreshSession(using refreshToken: String) async throws -> SessionTokens {
        SessionTokens(
            accessToken: "refreshed-access-token",
            refreshToken: refreshToken,
            userID: "demo-user"
        )
    }
}
