import SwiftUI

struct HomeView: View {
    @State var viewModel: HomeViewModel

    var body: some View {
        ScreenContainer {
            content
        }
        .task {
            await viewModel.load()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.state {
        case .loading:
            ProgressView("Loading…")
                .frame(maxWidth: .infinity, minHeight: 220)

        case .empty:
            HeaderBlock(
                "No Data",
                subtitle: "There is nothing to show yet."
            )

        case .success(let title):
            HeaderBlock(
                "Home",
                subtitle: "Use this feature folder as the starting point for migrated modules."
            )

            CardContainer {
                HStack(spacing: SpacingTokens.xs) {
                    DSIcon(systemName: "checkmark.seal.fill", style: .prominent)
                    Text(title)
                        .font(TypographyTokens.headline)
                        .foregroundStyle(ColorTokens.Text.primary)
                        .accessibilityLabel("Loaded successfully")
                }

                ChipBadge("Synced", role: .success, systemImage: "checkmark.circle.fill")
            }

            VStack(spacing: SpacingTokens.sm) {
                Button("Primary Action") {}
                    .buttonStyle(.ds(.primary))

                Button("Secondary Action") {}
                    .buttonStyle(.ds(.secondary))
            }

        case .error(let message):
            HeaderBlock("Something went wrong", subtitle: LocalizedStringKey(message))

            Button("Retry") {
                Task { await viewModel.retry() }
            }
            .buttonStyle(.ds(.destructive))
        }
    }
}

#Preview {
    HomeView(viewModel: HomeViewModel())
}
