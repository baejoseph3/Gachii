import SwiftUI

struct RootView: View {
    var body: some View {
        NavigationStack {
            HomeView(viewModel: HomeViewModel())
                .navigationTitle("Gachii")
        }
    }
}

#Preview {
    RootView()
        .environment(DependencyContainer.live)
}
