import SwiftUI

@main
struct GachiiApp: App {
    @State private var container = AppContainer.live

    var body: some Scene {
        WindowGroup {
            RootShellView(container: container)
                .environment(container)
        }
    }
}
