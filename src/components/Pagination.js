import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Button, Select } from "native-base";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons";

const Pagination = ({
  result,
  chapter,
  verse,
  setVerse,
  setChapter,
  book,
  books,
  idOfDocSet,
  setBook,
}) => {
  return (
    <>
      {result.data.docSets[0] && (
        <View style={styles.pagination}>
          <Button
            variant="unstyled"
            isDisabled={!result.data.docSets[0].document.nav.previousChapter}
            onPress={() =>
              setChapter(result.data.docSets[0].document.nav.previousChapter)
            }
          >
            <FontAwesomeIcon
              icon={faAngleDoubleLeft}
              size={20}
              color={
                !result.data.docSets[0].document.nav.previousVerse
                  ? "#EBEBE4"
                  : "#DF1919"
              }
            />
          </Button>

          <Button
            variant="unstyled"
            isDisabled={!result.data.docSets[0].document.nav.previousVerse}
            onPress={() =>
              setVerse(result.data.docSets[0].document.nav.previousVerse.verse)
            }
          >
            <FontAwesomeIcon
              icon={faAngleLeft}
              size={21}
              color={
                !result.data.docSets[0].document.nav.previousVerse
                  ? "#EBEBE4"
                  : "#DF1919"
              }
            />
          </Button>
          <Select
            selectedValue={book}
            minWidth={150}
            onValueChange={(itemValue) => {
              setBook(itemValue);
              setVerse("1");
              setChapter("1");
            }}
          >
            {books.data.docSets.length > 1 &&
              books.data.docSets
                .filter((item) => item.id === idOfDocSet)[0]
                .documents.map((item) => (
                  <Select.Item
                    key={item.id}
                    label={ item.name || item.name2}
                    value={item.bookCode}
                  />
                ))}
          </Select>
          
          <Text style={styles.textChapVers}>
            {chapter} : {verse}
          </Text>



          <Button
            variant="unstyled"
            isDisabled={!result.data.docSets[0].document.nav.nextVerse}
            onPress={() => {
              setVerse(result.data.docSets[0].document.nav.nextVerse.verse);
            }}
          >
            <FontAwesomeIcon
              icon={faAngleRight}
              size={21}
              color={
                !result.data.docSets[0].document.nav.nextVerse
                  ? "#EBEBE4"
                  : "#DF1919"
              }
            />
          </Button>

          <Button
            variant="unstyled"
            isDisabled={!result.data.docSets[0].document.nav.nextChapter}
            onPress={() =>
              setChapter(result.data.docSets[0].document.nav.nextChapter)
            }
          >
            <FontAwesomeIcon
              icon={faAngleDoubleRight}
              size={21}
              color={
                !result.data.docSets[0].document.nav.nextChapter
                  ? "#EBEBE4"
                  : "#DF1919"
              }
            />
          </Button>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  textChapVers: {
    fontSize: 15,
    fontWeight: "bold",
    paddingLeft:10,
  },
});

export default Pagination;
