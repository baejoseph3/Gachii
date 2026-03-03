import Foundation
import Security

struct SessionTokens: Codable, Equatable, Sendable {
    let accessToken: String
    let refreshToken: String
    let userID: String
}

protocol SessionTokenStoring {
    func load() throws -> SessionTokens?
    func save(_ tokens: SessionTokens) throws
    func clear() throws
}

enum SessionTokenStoreError: Error, Equatable {
    case encoding
    case decoding
    case storageFailure(OSStatus)
}

final class KeychainSessionTokenStore: SessionTokenStoring {
    private let account = "gachii.session.tokens"
    private let service: String

    init(service: String = "com.example.gachii") {
        self.service = service
    }

    func load() throws -> SessionTokens? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else {
            throw SessionTokenStoreError.storageFailure(status)
        }

        do {
            return try JSONDecoder().decode(SessionTokens.self, from: data)
        } catch {
            throw SessionTokenStoreError.decoding
        }
    }

    func save(_ tokens: SessionTokens) throws {
        let data: Data
        do {
            data = try JSONEncoder().encode(tokens)
        } catch {
            throw SessionTokenStoreError.encoding
        }

        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]

        let status = SecItemAdd(attributes as CFDictionary, nil)
        if status == errSecDuplicateItem {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: account
            ]

            let updateAttributes: [String: Any] = [kSecValueData as String: data]
            let updateStatus = SecItemUpdate(query as CFDictionary, updateAttributes as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw SessionTokenStoreError.storageFailure(updateStatus)
            }
            return
        }

        guard status == errSecSuccess else {
            throw SessionTokenStoreError.storageFailure(status)
        }
    }

    func clear() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw SessionTokenStoreError.storageFailure(status)
        }
    }
}
