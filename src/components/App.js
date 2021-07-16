import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import VersePage from "../pages/VersePage";
import ChapterPage from "../pages/ChapterPage";
import SearchPage from "../pages/SearchPage";
import AboutPage from "../pages/AboutPage";
import { createStackNavigator } from "@react-navigation/stack";
import { NativeBaseProvider } from "native-base";
import { Buffer } from "buffer";
import axios from "axios";
import { Proskomma } from "../proskomma/dist";
import LoadingPage from "../pages/LoadingPage";

global.Buffer = Buffer;
const pk = new Proskomma();
const Stack = createStackNavigator();

const App = () => {
  const [ndocsLoaded, setnDocsLoaded] = useState(0);
  const tabOfBook = ["lsg", "ust", "ugnt", "avd", "ult"];
  const [queryBook, setQueryBook] = useState("");
  const [books, setBooks] = useState();
  const [book, setBook] = useState("MAT");
  const [displayFields, setDisplayFields] = useState(tabOfBook);
  const [verse, setVerse] = useState(1);
  const [chapter, setChapter] = useState(1);
  const [idOfDocSet, setIdOfDocSet] = useState("eng_ult");
  const [visibleScreen, setVisibleScreen] = useState(true);
  const [selected, setSelected] = useState(1);

  useEffect(() => {
    const responseOfAxios = async () => {
      try {
        tabOfBook.forEach(async (book, index) => {
          const response = await axios.get(
            "https://raw.githubusercontent.com/Proskomma/succinct-json-examples/main/translation_" +
              book +
              ".json"
          );
          pk.loadSuccinctDocSet(response.data);
          setnDocsLoaded(index + 1);
        });
      } catch (error) {
        console.error("Erreur :" + error);
      }
    };
    responseOfAxios();
  }, []);

  const searchQueryBook = `{ nDocSets 
        nDocuments 
         docSets { selectors { key value } id documents { id bookCode: header(id:"bookCode") name:header(id:"toc3") name2:header(id:"toc2")}
          }
      }`;

  useEffect(() => {
    const browseQueryBook = searchQueryBook;
    setQueryBook(browseQueryBook);
    pk.gqlQuery(browseQueryBook)
      .then((output) => {
        setBooks(output);
      })
      .catch((err) => console.log(`ERROR1: Could not run query: '${err}'`));
  }, [ndocsLoaded, book]);

  useEffect(() => {
    setTimeout(() => {
      setVisibleScreen(false);
    }, 2000);
  }, []);

  // retrieval of the name of each translation (ex :ust, ult)
  const tabOfTranslationName = books
    ? books.data.docSets.map((item) => item.selectors[1].value)
    : [];

  return (
    <NativeBaseProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {visibleScreen && (
            <Stack.Screen
              name="LoadingPage"
              component={LoadingPage}
              options={{ headerShown: false }}
            />
          )}

          <Stack.Screen name="VersePage" options={{ headerShown: false }}>
            {(props) => (
              <VersePage
                {...props}
                book={book}
                books={books}
                setBook={setBook}
                setVerse={setVerse}
                setChapter={setChapter}
                setDisplayFields={setDisplayFields}
                displayFields={displayFields}
                chapter={chapter}
                verse={verse}
                ndocsLoaded={ndocsLoaded}
                pk={pk}
                tabOfTranslationName={tabOfTranslationName}
                idOfDocSet={idOfDocSet}
                selected={selected}
                setSelected={setSelected}
                setIdOfDocSet={setIdOfDocSet}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ChapterPage" options={{ headerShown: false }}>
            {(props) => (
              <ChapterPage
                {...props}
                idOfDocSet={idOfDocSet}
                setIdOfDocSet={setIdOfDocSet}
                books={books}
                setBook={setBook}
                setVerse={setVerse}
                setChapter={setChapter}
                pk={pk}
                ndocsLoaded={ndocsLoaded}
                chapter={chapter}
                verse={verse}
                book={book}
                selected={selected}
                setSelected={setSelected}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="SearchPage" options={{ headerShown: false }}>
            {(props) => (
              <SearchPage
                {...props}
                idOfDocSet={idOfDocSet}
                setIdOfDocSet={setIdOfDocSet}
                pk={pk}
                books={books}
                setVerse={setVerse}
                setChapter={setChapter}
                setBook={setBook}
                selected={selected}
                setSelected={setSelected}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="AboutPage" options={{ headerShown: false }}>
            {(props) => (
              <AboutPage
                {...props}
                selected={selected}
                setSelected={setSelected}
                idOfDocSet={idOfDocSet}
                setIdOfDocSet={setIdOfDocSet}
                books={books}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </NativeBaseProvider>
  );
};

export default App;
