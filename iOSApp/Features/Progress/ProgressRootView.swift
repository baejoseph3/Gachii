import SwiftUI

struct ProgressRootView: View {
    let container: AppContainer

    var body: some View {
        ContentUnavailableView(
            "Progress",
            systemImage: "chart.line.uptrend.xyaxis",
            description: Text("Progress insights placeholder.")
        )
        .navigationTitle("Progress")
    }
}

#Preview {
    NavigationStack {
        ProgressRootView(container: .live)
    }
}
