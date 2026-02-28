import SwiftUI

enum DSButtonRole {
    case primary
    case secondary
    case destructive
}

struct DSButtonStyle: ButtonStyle {
    let role: DSButtonRole

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(TypographyTokens.body.weight(.semibold))
            .foregroundStyle(foregroundColor)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .padding(.horizontal, SpacingTokens.md)
            .background(backgroundColor(configuration: configuration))
            .clipShape(RoundedRectangle(cornerRadius: SurfaceTokens.Radius.md, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
            .dynamicTypeSize(.xSmall ... .accessibility5)
    }

    private var foregroundColor: Color {
        switch role {
        case .primary, .destructive:
            return ColorTokens.Text.inverse
        case .secondary:
            return ColorTokens.Text.primary
        }
    }

    private func backgroundColor(configuration: Configuration) -> Color {
        let base: Color = switch role {
        case .primary:
            ColorTokens.Brand.primary
        case .secondary:
            ColorTokens.Surface.elevated
        case .destructive:
            ColorTokens.Status.error
        }

        return configuration.isPressed ? base.opacity(0.8) : base
    }
}

extension ButtonStyle where Self == DSButtonStyle {
    static func ds(_ role: DSButtonRole) -> DSButtonStyle {
        DSButtonStyle(role: role)
    }
}

enum DSBadgeRole {
    case neutral
    case success
    case warning
    case error
}

struct ChipBadge: View {
    let text: LocalizedStringKey
    let role: DSBadgeRole
    let systemImage: String?

    init(
        _ text: LocalizedStringKey,
        role: DSBadgeRole = .neutral,
        systemImage: String? = nil
    ) {
        self.text = text
        self.role = role
        self.systemImage = systemImage
    }

    var body: some View {
        HStack(spacing: SpacingTokens.xs) {
            if let systemImage {
                DSIcon(systemName: systemImage, style: .badge)
            }

            Text(text)
                .font(TypographyTokens.footnote.weight(.semibold))
                .lineLimit(1)
        }
        .foregroundStyle(foreground)
        .padding(.horizontal, SpacingTokens.sm)
        .padding(.vertical, SpacingTokens.xs)
        .background(background)
        .clipShape(Capsule())
        .dynamicTypeSize(.xSmall ... .accessibility3)
        .accessibilityElement(children: .combine)
    }

    private var background: Color {
        switch role {
        case .neutral:
            ColorTokens.Surface.elevated
        case .success:
            ColorTokens.Status.success.opacity(0.2)
        case .warning:
            ColorTokens.Status.warning.opacity(0.2)
        case .error:
            ColorTokens.Status.error.opacity(0.2)
        }
    }

    private var foreground: Color {
        switch role {
        case .neutral:
            ColorTokens.Text.secondary
        case .success:
            ColorTokens.Status.success
        case .warning:
            ColorTokens.Status.warning
        case .error:
            ColorTokens.Status.error
        }
    }
}

enum DSIconStyle {
    case body
    case badge
    case prominent

    var font: Font {
        switch self {
        case .body:
            .body.weight(.semibold)
        case .badge:
            .footnote.weight(.semibold)
        case .prominent:
            .title3.weight(.semibold)
        }
    }

    var tint: Color {
        switch self {
        case .body:
            ColorTokens.Text.secondary
        case .badge:
            ColorTokens.Text.secondary
        case .prominent:
            ColorTokens.Brand.primary
        }
    }
}

struct DSIcon: View {
    let systemName: String
    var style: DSIconStyle = .body

    var body: some View {
        Image(systemName: systemName)
            .font(style.font)
            .foregroundStyle(style.tint)
            .accessibilityHidden(true)
    }
}
