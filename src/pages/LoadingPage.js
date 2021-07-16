import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

const LoadingPage = () => {
  const logo = require("../assets/logo.png");
  return (
    <View style={styles.containerLoadingPage}>
      <Image source={logo} style={styles.logo} />

      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            textAlign: "center",
            fontWeight: "bold",
            fontFamily: "papyrus",
            letterSpacing: 2,
            margin: "auto",
          }}
        >
          <Text style={styles.firstLetterKoniortos}>K</Text>
          <Text style={styles.letterOfKoniortos}>ONIORTOS</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerLoadingPage: {
    backgroundColor: "#415DE2",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  textLoadingPage: {
    fontSize: 30,
    color: "white",
    marginBottom: 20,
  },
  logo : { 
    width: 250, 
    height: 220,
  },
  firstLetterKoniortos: {
    fontSize: 37,
    color: "white",
  },
  letterOfKoniortos: {
    fontSize: 21,
    color: "white",
  },
});

export default LoadingPage;
