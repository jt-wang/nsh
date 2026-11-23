// A case of the API's test suite (docs/dev/compatibility.md): what decides
// a `<Text>`'s lines as the platform receives it: the styles `numberOfLines`
// (the lines also decide its height), `textOverflow` and `userSelect`, and
// the prop `adjustsFontSizeToFit`, which shrinks the font until
// the text fits, at most to `minimumFontScale` (text that fits keeps its
// size). Its script
// checks each.
import { Text, View, signal } from "nsh";

const LONG = "One two three four five six seven eight nine ten eleven twelve";

function App() {
  const shimmer = signal(true);
  return (
    <View style={{ flex: 1, paddingTop: 64, alignItems: "flex-start" }}>
      <Text testID="two" style={{ numberOfLines: 2, width: 100, fontSize: 10, lineHeight: 12 }}>
        {LONG}
      </Text>
      <Text testID="all" style={{ width: 100, fontSize: 10, lineHeight: 12 }}>
        {LONG}
      </Text>
      <Text testID="head" style={{ numberOfLines: 1, textOverflow: "ellipsis-start" }}>
        Head
      </Text>
      <Text testID="selectable" style={{ userSelect: "text" }}>
        Selectable
      </Text>
      <Text
        testID="fit"
        adjustsFontSizeToFit={true}
        style={{ numberOfLines: 1, width: 100, fontSize: 20 }}
      >
        Fits
      </Text>
      <Text
        testID="fit-min"
        adjustsFontSizeToFit={true}
        minimumFontScale={0.5}
        style={{ numberOfLines: 1, width: 100, fontSize: 20 }}
      >
        {LONG}
      </Text>
      <Text testID="plain">Plain</Text>
      <Text testID="shimmer" shimmer={shimmer()}>Shimmer</Text>
      <Text testID="shimmer-off" shimmer={false} shimmerColor="#123456">Static</Text>
      <View testID="shimmer-toggle" onPress={() => shimmer.set(!shimmer())}>
        <Text>Toggle shimmer</Text>
      </View>
    </View>
  );
}

export default App;
