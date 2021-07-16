import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Footer from "../components/Footer";
import { Text, ScrollView, Menu, HamburgerIcon } from "native-base";
import Loading from "../components/Loading";
import Pagination from "../components/Pagination";
import ListCheckBox from "../components/ListCheckBox";
import PickerTranslations from "../components/PickerTranslations";

const VersePage = ({
  book,
  navigation,
  books,
  setBook,
  setVerse,
  setChapter,
  setDisplayFields,
  verse,
  chapter,
  displayFields,
  ndocsLoaded,
  pk,
  tabOfTranslationName,
  idOfDocSet,
  setNameOfPage,
  nameOfPage,
  selected,
  setSelected,
  setIdOfDocSet,
}) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState();

  const exactSearchQueryTemplate =
    " {\n" +
    "  docSets {\n" +
    "    selectors { key value }\n" +
    '    document (bookCode:"%book%") {\n' +
    "      id\n" +
    '      bookCode: header(id: "bookCode" )\n' +
    '      title: header(id: "toc2")\n' +
    '      cv (chapter:"%chapter%" verses:["%verse%"]) { text }' +
    '      nav: cvNavigation(chapter:"%chapter%" verse: "%verse%") {\n' +
    "        previousVerse { chapter verse }\n" +
    "        nextVerse { chapter verse }\n" +
    "      previousChapter \n" +
    "nextChapter\n" +
    "    }" +
    "  }" +
    "  }" +
    "}";

  useEffect(() => {
    const browseQuery = exactSearchQueryTemplate
      .replace(/%chapter%/g, chapter)
      .replace(/%verse%/g, verse)
      .replace(/%book%/g, book);

    setQuery(browseQuery);

    pk.gqlQuery(browseQuery)
      .then((output) => {
        setResult(output);
      })
      .catch((err) => console.log(`ERROR: Could not run query: '${err}'`));
  }, [verse, chapter, ndocsLoaded, book]);

  const handlePressMenu = () => {
    console.log("coucou");
  };

  if (!result || !books) {
    return (
      <View style={styles.containerVersePage}>
        <Loading />
        <Footer
          navigation={navigation}
          setNameOfPage={setNameOfPage}
          nameOfPage={nameOfPage}
          selected={selected}
          setSelected={setSelected}
        />
      </View>
    );
  } else {
    return (
      <View style={styles.containerVersePage}>
        <View style={styles.headerVersePage}>
          <Menu
            placement="top right"
            shouldOverlapWithTrigger
            trigger={(triggerProps) => {
              return (
                <Pressable
                  accessibilityLabel="More options menu"
                  {...triggerProps}
                >
                  <HamburgerIcon style={styles.hamburger} />
                </Pressable>
              );
            }}
          >
            <Menu.Item onPress={() => navigation.navigate("AboutPage")}>
              About
            </Menu.Item>
          </Menu>
          <Text style={styles.containerKoniortosText}>
            <Text style={styles.firstLetterKoniortos}>K</Text>
            <Text style={styles.letterOfKoniortos}>ONIORTOS</Text>
          </Text>

          <View>
            <PickerTranslations
              idOfDocSet={idOfDocSet}
              setIdOfDocSet={setIdOfDocSet}
              books={books}
            />
          </View>
        </View>

        <Pagination
          result={result}
          chapter={chapter}
          verse={verse}
          setVerse={setVerse}
          setChapter={setChapter}
          book={book}
          books={books}
          idOfDocSet={idOfDocSet}
          setBook={setBook}
        />

        <ListCheckBox
          tabOfTranslationName={tabOfTranslationName}
          setDisplayFields={setDisplayFields}
          displayFields={displayFields}
          result={result}
        />

        <ScrollView style={styles.bodyVersePage}>
          {result.data.docSets.map((item) =>
            displayFields.includes(item.selectors[1].value) ? (
              <View key={item.document.id} style={styles.textBible}>
                <Text style={styles.titleBible}>
                  {item.selectors[1].value.toUpperCase()} -{" "}
                  {item.selectors[0].value}
                </Text>
                <Text>{item.document.cv[0].text}</Text>
              </View>
            ) : null
          )}
        </ScrollView>
        <View>
          <Footer
            navigation={navigation}
            setNameOfPage={setNameOfPage}
            nameOfPage={nameOfPage}
            selected={selected}
            setSelected={setSelected}
          />
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  containerVersePage: {
    minHeight: "100%",
  },
  headerVersePage: {
    width: "100%",
    height: 50,
    backgroundColor: "#415DE2",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  textBible: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 15,
  },
  titleBible: {
    fontWeight: "bold",
    marginBottom: 3,
  },
  bodyVersePage: {
    marginBottom: 60,
    height: 50,
  },
  containerKoniortosText: {
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "papyrus",
    letterSpacing: 2,
    margin: "auto",
  },
  firstLetterKoniortos: {
    fontSize: 37,
    color: "white",
  },
  containerPage: {
    flex: 1,
    alignItems: "center",
  },
  letterOfKoniortos: {
    fontSize: 21,
    color: "white",
  },
  hamburger: {
    color: "white",
  },
});

export default VersePage;
