//! This is a generated file. Don't modify it by hand! Run 'cargo codegen formatter' to re-generate the file.

use crate::prelude::*;
use biome_css_syntax::AnyCssQueryFeatureValue;
#[derive(Debug, Clone, Default)]
pub(crate) struct FormatAnyCssQueryFeatureValue;
impl FormatRule<AnyCssQueryFeatureValue> for FormatAnyCssQueryFeatureValue {
    type Context = CssFormatContext;
    fn fmt(&self, node: &AnyCssQueryFeatureValue, f: &mut CssFormatter) -> FormatResult<()> {
        match node {
            AnyCssQueryFeatureValue::CssNumber(node) => node.format().fmt(f),
            AnyCssQueryFeatureValue::AnyCssDimension(node) => node.format().fmt(f),
            AnyCssQueryFeatureValue::CssIdentifier(node) => node.format().fmt(f),
            AnyCssQueryFeatureValue::CssRatio(node) => node.format().fmt(f),
            AnyCssQueryFeatureValue::CssAnyFunction(node) => node.format().fmt(f),
        }
    }
}
