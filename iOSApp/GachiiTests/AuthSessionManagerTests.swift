import XCTest
@testable import GachiiApp

final class AuthSessionManagerTests: XCTestCase {
    func testRefreshSessionPersistsRefreshedTokens() async throws {
        let initial = SessionTokens(accessToken: "old-access", refreshToken: "old-refresh", userID: "user-1")
        let tokenStore = InMemorySessionTokenStore(tokens: initial)
        let authService = MockSupabaseAuthService(refreshedTokens: SessionTokens(accessToken: "new-access", refreshToken: "new-refresh", userID: "user-1"))
        let manager = AuthSessionManager(tokenStore: tokenStore, authService: authService)

        try await manager.refreshSession()

        XCTAssertEqual(tokenStore.tokens?.accessToken, "new-access")
        XCTAssertEqual(tokenStore.tokens?.refreshToken, "new-refresh")
        XCTAssertEqual(manager.currentUserID, "user-1")
    }

    func testSignOutClearsStoredTokens() async throws {
        let tokenStore = InMemorySessionTokenStore(tokens: SessionTokens(accessToken: "a", refreshToken: "r", userID: "user-1"))
        let manager = AuthSessionManager(tokenStore: tokenStore, authService: MockSupabaseAuthService(refreshedTokens: SessionTokens(accessToken: "n", refreshToken: "n", userID: "user-1")))

        try await manager.signOut()

        XCTAssertNil(tokenStore.tokens)
        XCTAssertFalse(manager.isAuthenticated)
    }
}

private final class InMemorySessionTokenStore: SessionTokenStoring {
    var tokens: SessionTokens?

    init(tokens: SessionTokens?) {
        self.tokens = tokens
    }

    func load() throws -> SessionTokens? { tokens }

    func save(_ tokens: SessionTokens) throws {
        self.tokens = tokens
    }

    func clear() throws {
        tokens = nil
    }
}

private struct MockSupabaseAuthService: SupabaseAuthServicing {
    let refreshedTokens: SessionTokens

    func refreshSession(using refreshToken: String) async throws -> SessionTokens {
        refreshedTokens
    }
}
