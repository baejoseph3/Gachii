import XCTest
@testable import GachiiApp

final class SupabaseClientTests: XCTestCase {
    func testExecuteDecodesResponseOnSuccessStatusCode() async throws {
        let payload = try JSONEncoder().encode(TestDTO(value: "ok"))
        let transport = MockTransport(result: .success((payload, HTTPURLResponse(url: URL(string: "https://example.supabase.co")!, statusCode: 200, httpVersion: nil, headerFields: nil)!)))
        let client = SupabaseClient(transport: transport)

        let result: TestDTO = try await client.execute(SupabaseRequest(path: "profiles"), as: TestDTO.self)

        XCTAssertEqual(result, TestDTO(value: "ok"))
    }

    func testExecuteMapsStatusCodeToTypedError() async {
        let transport = MockTransport(result: .success((Data(), HTTPURLResponse(url: URL(string: "https://example.supabase.co")!, statusCode: 401, httpVersion: nil, headerFields: nil)!)))
        let client = SupabaseClient(transport: transport)

        do {
            let _: TestDTO = try await client.execute(SupabaseRequest(path: "profiles"), as: TestDTO.self)
            XCTFail("Expected unauthorized error")
        } catch {
            XCTAssertEqual(error as? APIError, .unauthorized)
        }
    }

    func testUnconfiguredClientThrowsConfigurationError() async {
        let client = UnconfiguredSupabaseClient()

        do {
            let _: TestDTO = try await client.execute(SupabaseRequest(path: "profiles"), as: TestDTO.self)
            XCTFail("Expected configuration error")
        } catch {
            XCTAssertEqual(error as? APIError, .configuration)
        }
    }
}

private struct TestDTO: Codable, Equatable {
    let value: String
}

private struct MockTransport: SupabaseTransporting {
    let result: Result<(Data, HTTPURLResponse), Error>

    func send(request: SupabaseRequest) async throws -> (Data, HTTPURLResponse) {
        try result.get()
    }
}
