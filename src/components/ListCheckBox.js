import React from "react";
import { View, StyleSheet } from "react-native";
import { Checkbox } from "native-base";

const ListCheckBox = ({
  displayFields,
  setDisplayFields,
  tabOfTranslationName,
}) => {
  const handleChange = (bookId) => {
    if (!displayFields.includes(bookId)) {
      setDisplayFields([...displayFields, bookId]);
    } else {
      setDisplayFields(displayFields.filter((f) => f !== bookId));
    }
  };

  return (
    <View style={styles.containerListCheckboxs}>
      {tabOfTranslationName.map((book) => (
        <View style={styles.checkboxs} key={book}>
          <Checkbox
            accessibilityLabel="This is a dummy checkbox"
            onChange={() => {
              handleChange(book);
              console.log(displayFields);
            }}
            size="sm"
            value={book}
            isChecked={displayFields.includes(book)}
            colorScheme="red"
          >
            {book.toUpperCase()}
          </Checkbox>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  containerListCheckboxs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  checkboxs: {
    flexDirection: "column",
    marginTop: 10,
    marginBottom: 30,
  },
});

export default ListCheckBox;
