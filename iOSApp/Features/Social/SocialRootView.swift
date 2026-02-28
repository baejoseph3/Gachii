import SwiftUI

struct SocialRootView: View {
    let container: AppContainer

    var body: some View {
        ContentUnavailableView(
            "Social",
            systemImage: "person.2",
            description: Text("Community feed placeholder.")
        )
        .navigationTitle("Social")
    }
}

#Preview {
    NavigationStack {
        SocialRootView(container: .live)
    }
}
