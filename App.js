import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BookDetailsPage from "./BookDetailsPage";
import AudioPlayerPage from "./AudioPlayerPage";

const Tab = createBottomTabNavigator();

const MainApp = () => {
  const [initialBook, setInitialBook] = useState(null);

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
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === "Player") {
              iconName = "headset";
            } else if (route.name === "Add Book") {
              iconName = "add-circle-outline";
            }
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#4a8fff",
          tabBarInactiveTintColor: "#6a8caf",
          tabBarStyle: {
            backgroundColor: "#0a192f",
            borderTopColor: "#1e3a5f",
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
        />
        <Tab.Screen name="Add Book" component={BookDetailsPage} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default MainApp;
