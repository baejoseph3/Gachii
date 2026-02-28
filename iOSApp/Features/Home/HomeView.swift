import SwiftUI

struct HomeView: View {
    @State var viewModel: HomeViewModel

    var body: some View {
        content
            .padding(DesignTokens.Spacing.md)
            .task {
                await viewModel.load()
            }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.state {
        case .loading:
            ProgressView("Loading…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .empty:
            ContentUnavailableView(
                "No Data",
                systemImage: "tray",
                description: Text("There is nothing to show yet.")
            )
        case .success(let title):
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                Label(title, systemImage: "checkmark.seal.fill")
                    .font(.headline)
                    .accessibilityLabel("Loaded successfully")
                Text("Use this feature folder as the starting point for migrated modules.")
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case .error(let message):
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(message)
                    .multilineTextAlignment(.center)
                Button("Retry") {
                    Task { await viewModel.retry() }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

#Preview {
    HomeView(viewModel: HomeViewModel())
}
