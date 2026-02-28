import SwiftUI

struct ScreenContainer<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SpacingTokens.lg) {
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, SpacingTokens.md)
            .padding(.vertical, SpacingTokens.lg)
        }
        .background(ColorTokens.Surface.canvas.ignoresSafeArea())
    }
}

struct HeaderBlock: View {
    let title: LocalizedStringKey
    let subtitle: LocalizedStringKey?

    init(
        _ title: LocalizedStringKey,
        subtitle: LocalizedStringKey? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: SpacingTokens.xs) {
            Text(title)
                .font(TypographyTokens.title.weight(TypographyTokens.emphasisWeight))
                .foregroundStyle(ColorTokens.Text.primary)

            if let subtitle {
                Text(subtitle)
                    .font(TypographyTokens.body)
                    .foregroundStyle(ColorTokens.Text.secondary)
            }
        }
        .dynamicTypeSize(.xSmall ... .accessibility5)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct CardContainer<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: SpacingTokens.sm) {
            content
        }
        .padding(SpacingTokens.md)
        .background(ColorTokens.Surface.primary)
        .clipShape(RoundedRectangle(cornerRadius: SurfaceTokens.Radius.md, style: .continuous))
        .shadow(
            color: SurfaceTokens.Shadow.color,
            radius: SurfaceTokens.Shadow.radius,
            x: SurfaceTokens.Shadow.x,
            y: SurfaceTokens.Shadow.y
        )
    }
}
