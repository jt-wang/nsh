// A case of the API's test suite (docs/dev/compatibility.md): the props of
// `<Text>` that decide its lines as the platform receives them:
// `numberOfLines` (the lines also decide its height), `ellipsizeMode`,
// `selectable`, and `adjustsFontSizeToFit`, which shrinks the font until
// the text fits, at most to `minimumFontScale` (text that fits keeps its
// size). Its script
// checks each.
import { Text, View, signal } from "nsh";

const LONG = "One two three four five six seven eight nine ten eleven twelve";

function App() {
  const shimmer = signal(true);
  return (
    <View style={{ flex: 1, paddingTop: 64, alignItems: "flex-start" }}>
      <Text testID="two" numberOfLines={2} style={{ width: 100, fontSize: 10, lineHeight: 12 }}>
        {LONG}
      </Text>
      <Text testID="all" style={{ width: 100, fontSize: 10, lineHeight: 12 }}>
        {LONG}
      </Text>
      <Text testID="head" numberOfLines={1} ellipsizeMode="head">
        Head
      </Text>
      <Text testID="selectable" selectable={true}>
        Selectable
      </Text>
      <Text
        testID="fit"
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        style={{ width: 100, fontSize: 20 }}
      >
        Fits
      </Text>
      <Text
        testID="fit-min"
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.5}
        style={{ width: 100, fontSize: 20 }}
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
