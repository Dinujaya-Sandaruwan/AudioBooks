import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StyleSheet, Linking, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";

import BookDetailsPage from "./BookDetailsPage";
import AudioPlayerPage from "./AudioPlayerPage";

const Tab = createBottomTabNavigator();

const MainApp = () => {
  const [initialBook, setInitialBook] = useState(null);

  const openGitHubRepo = () => {
    Linking.openURL("https://github.com/Dinujaya-Sandaruwan/Sonora");
  };

  useEffect(() => {
    const loadInitialBook = async () => {
      try {
        const savedBook = await AsyncStorage.getItem("lastAddedBook");
        if (savedBook) {
          setInitialBook(JSON.parse(savedBook));
        }
      } catch (error) {
        console.error("Error loading initial book:", error);
      }
    };

    loadInitialBook();
  }, []);

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            contentStyle: {
              backgroundColor: "#0a192f",
            },
            headerRight: () => (
              <TouchableOpacity
                onPress={openGitHubRepo}
                style={styles.githubIcon}
              >
                <AntDesign name="github" size={24} color="white" />
              </TouchableOpacity>
            ),
            headerLeft: () => (
              <Ionicons
                name="library"
                size={24}
                color="white"
                style={styles.navIcon}
              />
            ),
            headerTitle: "Sonora Audiobooks",
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === "Player") {
                iconName = "headset";
              } else if (route.name === "AddBook") {
                iconName = "add-circle-outline";
              }
              return (
                <MaterialIcons name={iconName} size={size} color={color} />
              );
            },
            tabBarActiveTintColor: "#4a8fff",
            tabBarInactiveTintColor: "#6a8caf",
            tabBarStyle: {
              backgroundColor: "#0a192f",
              borderTopColor: "#1e3a5f",
              borderTopWidth: 0,
              position: "absolute",
              bottom: 10,
              left: 0,
              right: 0,
              elevation: 0,
            },
            headerStyle: {
              backgroundColor: "#0a192f",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          })}
        >
          <Tab.Screen
            name="Player"
            component={AudioPlayerPage}
            initialParams={{ initialBook }}
            options={{
              tabBarLabel: "Player",
            }}
          />
          <Tab.Screen
            name="AddBook"
            component={BookDetailsPage}
            options={{
              tabBarLabel: "Add Book",
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a192f",
  },
  navIcon: {
    marginLeft: 15,
  },
  githubIcon: {
    marginRight: 15,
  },
});

export default MainApp;
