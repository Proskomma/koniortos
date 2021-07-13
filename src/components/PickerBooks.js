import React from "react";
import { Header, View } from "native-base";
import Icon from "react-native-vector-icons/FontAwesome";
import { StyleSheet } from "react-native";

const PickerBooks = ({
  books,
  setBook,
  setVerse,
  setChapter,
  book,
  idOfDocSet,
}) => {
  return (
    <>
      <View style={styles.containerHeader}>
        <Header style={styles.header}>
          <Icon name="book" size={26} color="white" />
          <Picker
            mode="dropdown"
            style={styles.pickerForm}
            selectedValue={book}
            onValueChange={(value) => {
              setBook(value);
              setVerse("1");
              setChapter("1");
            }}
          >
            {books.data.docSets.length > 1 &&
              books.data.docSets
                .filter((item) => item.id === idOfDocSet)[0]
                .documents.map((item) => (
                  <Picker.Item
                    style={styles.pickerItem}
                    key={item.id}
                    label={item.name}
                    value={item.bookCode}
                  />
                ))}
          </Picker>
        </Header>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pickerForm: {
    width: "50%",
    color: "white",
    backgroundColor: "transparent",
  },
  pickerItem: {},
  containerHeader: {
    width: "75%",
  },
});

export default PickerBooks;
