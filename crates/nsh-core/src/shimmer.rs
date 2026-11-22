//! Shared paint parameters for a text's native shimmer.

use std::time::Duration;

use crate::{Color, Hsla, Rgba, geometry::Percentage};

/// Time for one linear left-to-right sweep, repeated indefinitely.
pub const PERIOD: Duration = Duration::from_millis(2800);
/// Band width as a fraction of the text block's width.
pub const BAND_WIDTH: Percentage = Percentage(1.0 / 3.0);
/// Highlight coverage at the leading edge, center and trailing edge of the band.
pub const COVERAGE: [Percentage; 3] = [Percentage(0.0), Percentage(1.0), Percentage(0.0)];
/// Amount of white or black mixed into the base color for the default highlight.
pub const DEFAULT_MIX: Percentage = Percentage(0.45);

/// Resolves a default highlight in sRGB, preserving the base color's alpha.
pub fn highlight(base: Color) -> Color {
    let target = if Hsla::from(base).l >= 0.5 { 1.0 } else { 0.0 };
    let mut color = Rgba::from(base);
    color.r += (target - color.r) * DEFAULT_MIX.0;
    color.g += (target - color.g) * DEFAULT_MIX.0;
    color.b += (target - color.b) * DEFAULT_MIX.0;
    Color::from(color)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn highlight_follows_lightness_and_preserves_alpha() {
        for (base, expected) in [
            (0x929292ff, 0xc3c3c3ff),
            (0x666666ff, 0x383838ff),
            (0x808080ff, 0xb9b9b9ff),
            (0x7f7f7fff, 0x464646ff),
            (0xffffffff, 0xffffffff),
            (0x000000ff, 0x000000ff),
            (0x92929280, 0xc3c3c380),
            (0x00000000, 0x00000000),
        ] {
            assert_eq!(highlight(Color(base)), Color(expected));
        }
    }
}
