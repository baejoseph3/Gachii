import Foundation

enum HomeViewState: Equatable {
    case loading
    case empty
    case success(title: String)
    case error(message: String)
}

@MainActor
@Observable
final class HomeViewModel {
    private(set) var state: HomeViewState = .loading

    func load() async {
        state = .loading

        do {
            try await Task.sleep(for: .milliseconds(150))
            state = .success(title: "Welcome to Gachii iOS")
        } catch {
            state = .error(message: "Something went wrong. Please try again.")
        }
    }

    func retry() async {
        await load()
    }
}
