import SwiftUI

struct WorkoutRootView: View {
    @State private var viewModel: WorkoutRootViewModel

    init(container: AppContainer) {
        _viewModel = State(initialValue: WorkoutRootViewModel(repository: container.workoutRepository))
    }

    var body: some View {
        ScreenContainer {
            content
        }
        .navigationTitle("Workout")
        .task {
            guard case .loading = viewModel.state else { return }
            await viewModel.load()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.state {
        case .loading:
            ProgressView("Loading workouts…")
                .frame(maxWidth: .infinity, minHeight: 220)

        case .empty:
            HeaderBlock(
                "Workout",
                subtitle: "No recent workouts yet. Start your first session to build momentum."
            )

            CardContainer {
                ChipBadge("Ready to train", role: .neutral, systemImage: "bolt.fill")
            }

        case .success(let workouts):
            HeaderBlock(
                "Workout",
                subtitle: "Your most recent sessions"
            )

            ForEach(workouts) { workout in
                CardContainer {
                    HStack(alignment: .center, spacing: SpacingTokens.sm) {
                        DSIcon(systemName: "figure.strengthtraining.traditional", style: .prominent)

                        VStack(alignment: .leading, spacing: SpacingTokens.xs) {
                            Text(workout.title)
                                .font(TypographyTokens.headline)
                                .foregroundStyle(ColorTokens.Text.primary)

                            Text("\(workout.durationMinutes) min")
                                .font(TypographyTokens.body)
                                .foregroundStyle(ColorTokens.Text.secondary)
                        }

                        Spacer(minLength: SpacingTokens.md)
                    }
                }
            }

        case .error(let message):
            HeaderBlock("Something went wrong", subtitle: LocalizedStringKey(message))

            Button("Retry") {
                Task { await viewModel.retry() }
            }
            .buttonStyle(.ds(.primary))
        }
    }
}

#Preview {
    NavigationStack {
        WorkoutRootView(container: .live)
    }
}
