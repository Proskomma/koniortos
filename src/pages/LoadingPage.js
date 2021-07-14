import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

const LoadingPage = () => {
  const logo = require("../assets/logo.png");
  return (
    <View style={styles.containerLoadingPage}>
      <Image source={logo} style={{ width: 250, height: 220 }} />

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
          <Text style={{ fontSize: 67, color: "white" }}>K</Text>
          <Text style={{ fontSize: 41, color: "white" }}>ONIORTOS</Text>
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
});

export default LoadingPage;
