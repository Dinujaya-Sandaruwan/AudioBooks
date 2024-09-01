import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BookDetailsPage = ({ navigation }) => {
  const [bookDetails, setBookDetails] = useState({
    title: "",
    author: "",
    description: "",
    coverUri: null,
    audioUri: null,
  });

  const handleInputChange = (field, value) => {
    setBookDetails((prev) => ({ ...prev, [field]: value }));
  };

  const pickCover = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*" });
      if (result.assets && result.assets.length > 0) {
        setBookDetails((prev) => ({ ...prev, coverUri: result.assets[0].uri }));
      }
    } catch (error) {
      console.error("Error picking cover:", error);
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
      if (result.assets && result.assets.length > 0) {
        setBookDetails((prev) => ({ ...prev, audioUri: result.assets[0].uri }));
      }
    } catch (error) {
      console.error("Error picking audio:", error);
    }
  };

  const handleSave = async () => {
    console.log("Saving book details:", bookDetails);
    try {
      await AsyncStorage.setItem("lastAddedBook", JSON.stringify(bookDetails));
      navigation.navigate("Player", { book: bookDetails });
    } catch (error) {
      console.error("Error saving book details:", error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add New Audiobook</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#6a8caf"
          value={bookDetails.title}
          onChangeText={(text) => handleInputChange("title", text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Author"
          placeholderTextColor="#6a8caf"
          value={bookDetails.author}
          onChangeText={(text) => handleInputChange("author", text)}
        />
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Description"
          placeholderTextColor="#6a8caf"
          value={bookDetails.description}
          onChangeText={(text) => handleInputChange("description", text)}
          multiline
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={pickCover}>
            <MaterialIcons name="image" size={24} color="#fff" />
            <Text style={styles.buttonText}>Pick Cover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={pickAudio}>
            <MaterialIcons name="audiotrack" size={24} color="#fff" />
            <Text style={styles.buttonText}>Pick Audio</Text>
          </TouchableOpacity>
        </View>
        {bookDetails.coverUri && (
          <Image
            source={{ uri: bookDetails.coverUri }}
            style={styles.coverPreview}
          />
        )}
        {bookDetails.audioUri && (
          <Text style={styles.selectedFile}>
            Audio file selected: {bookDetails.audioUri.split("/").pop()}
          </Text>
        )}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Audiobook</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a192f",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A90E2",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    marginBottom: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    borderRadius: 8,
    color: "#fff",
    backgroundColor: "#0e2a47",
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a5f",
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  buttonText: {
    color: "#fff",
    marginLeft: 8,
  },
  coverPreview: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
    marginBottom: 20,
  },
  selectedFile: {
    color: "#4a8fff",
    marginTop: 10,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#4a8fff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default BookDetailsPage;
