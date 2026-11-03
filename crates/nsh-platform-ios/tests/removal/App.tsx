// A view swapped for another under a layout animation that only fades what is removed. The subtree goes out whole.
import { LayoutAnimation, mount, signal, Text, View } from "nsh";

const swapped = signal(false);

function App() {
  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff", paddingTop: 80 }}>
      <View
        role="button"
        testID="swap"
        style={{ height: 60, backgroundColor: "#dddddd" }}
        onPress={() => {
          LayoutAnimation.configureNext({
            duration: 8000,
            delete: { type: "linear", property: "opacity" },
          });
          swapped.set(true);
        }}
      >
        <Text>swap</Text>
      </View>
      <If
        when={swapped()}
        else={
          <View testID="old" style={{ height: 300 }}>
            <View style={{ height: 300, backgroundColor: "#ff0000" }} />
          </View>
        }
      >
        <View testID="new" style={{ height: 300 }} />
      </If>
    </View>
  );
}
mount(App);
