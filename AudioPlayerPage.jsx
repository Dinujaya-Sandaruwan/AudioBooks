import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

const AudioPlayerPage = () => {
  const route = useRoute();
  const [book, setBook] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const savedPositionRef = useRef(0);

  useEffect(() => {
    loadLastBook();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (route.params?.book) {
      setBook(route.params.book);
    }
  }, [route.params?.book]);

  useEffect(() => {
    if (book?.audioUri) {
      loadAudio(book.audioUri);
    }
  }, [book]);

  const loadLastBook = async () => {
    try {
      const savedBook = await AsyncStorage.getItem("lastAddedBook");
      const savedPosition = await AsyncStorage.getItem("lastPlaybackPosition");
      if (savedBook) {
        setBook(JSON.parse(savedBook));
      }
      if (savedPosition) {
        savedPositionRef.current = parseInt(savedPosition, 10);
      }
    } catch (error) {
      console.error("Error loading last book:", error);
      setError("Failed to load the last book");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAudio = async (audioUri) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Loading audio from:", audioUri);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, positionMillis: savedPositionRef.current }
      );
      setSound(newSound);
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
        setPosition(savedPositionRef.current);
        await newSound.setPositionAsync(savedPositionRef.current);
      } else {
        throw new Error("Failed to load audio");
      }
    } catch (error) {
      console.error("Error loading audio:", error);
      setError(`Failed to load audio: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const updatePosition = async () => {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setPosition(status.positionMillis);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(updatePosition, 1000);
    return () => clearInterval(interval);
  }, [sound]);

  const seekAudio = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
      setPosition(value);
    }
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const changePlaybackSpeed = async (speed) => {
    setPlaybackSpeed(speed);
    if (sound) {
      await sound.setRateAsync(speed, true);
    }
  };

  const savePlaybackState = async () => {
    try {
      await AsyncStorage.setItem("lastPlaybackPosition", position.toString());
      console.log("Playback position saved:", position);
    } catch (error) {
      console.error("Error saving playback position:", error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#4a8fff" />
          <Text style={styles.loadingText}>Loading audio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>
            {error || "No book available. Please add a book."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={{ uri: book.coverUri }} style={styles.cover} />
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingComplete={seekAudio}
          minimumTrackTintColor="#4a8fff"
          maximumTrackTintColor="#1e3a5f"
          thumbTintColor="#4a8fff"
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.controlButton}>
            <MaterialIcons name="skip-previous" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={48}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <MaterialIcons name="skip-next" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.speedContainer}>
          <Text style={styles.speedLabel}>Playback Speed:</Text>
          <Picker
            selectedValue={playbackSpeed}
            style={styles.speedPicker}
            onValueChange={(itemValue) => changePlaybackSpeed(itemValue)}
          >
            <Picker.Item label="1x" value={1} />
            <Picker.Item label="1.25x" value={1.25} />
            <Picker.Item label="1.5x" value={1.5} />
            <Picker.Item label="1.75x" value={1.75} />
            <Picker.Item label="2x" value={2} />
          </Picker>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={savePlaybackState}>
          <Text style={styles.saveButtonText}>Save Current Position</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a192f",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  cover: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    textAlign: "center",
  },
  author: {
    fontSize: 18,
    color: "#6a8caf",
    marginBottom: 20,
    textAlign: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  timeText: {
    color: "#6a8caf",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  controlButton: {
    marginHorizontal: 20,
  },
  playButton: {
    backgroundColor: "#1e3a5f",
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  speedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  speedLabel: {
    color: "#fff",
    marginRight: 10,
  },
  speedPicker: {
    width: 150,
    color: "#fff",
    backgroundColor: "#1e3a5f",
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
  loadingText: {
    color: "#fff",
    marginTop: 20,
  },
  errorText: {
    color: "#ff4a4a",
    textAlign: "center",
  },
});

export default AudioPlayerPage;
