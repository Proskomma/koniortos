import React from "react";
import { View, StyleSheet } from "react-native";
import { Select } from "native-base";

const PickerTranslations = ({ setIdOfDocSet, idOfDocSet, books }) => {
  return (
    <View>
      <Select
        variant="unstyled"
        style={styles.picker}
        minWidth={95}
        selectedValue={idOfDocSet}
        onValueChange={(itemValue) => {
          setIdOfDocSet(itemValue);
        }}
      >
        {books &&
          books.data.docSets.map((item) => (
            <Select.Item
              key={item.id}
              label={item.selectors[1].value.toUpperCase()}
              value={item.id}
            />
          ))}
      </Select>
    </View>
  );
};

const styles = StyleSheet.create({
  picker: {
    color: "white",
  },
});

export default PickerTranslations;
