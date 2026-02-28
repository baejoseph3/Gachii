import SwiftUI

@main
struct GachiiApp: App {
    @State private var container = DependencyContainer.live

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(container)
        }
    }
}
