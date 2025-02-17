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
  AppState,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DropDownPicker from "react-native-dropdown-picker";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

const BACKGROUND_AUDIO_TASK = "background-audio-task";

TaskManager.defineTask(BACKGROUND_AUDIO_TASK, async () => {
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

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
  const [openSpeed, setOpenSpeed] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");
  const savedPositionRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    setupAudio();
    setupRemoteControls();
    setupAppStateListener();
    loadLastBook();

    return () => {
      cleanupAudio();
      cleanupRemoteControls();
    };
  }, []);

  const setupRemoteControls = async () => {
    try {
      // Register background task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_AUDIO_TASK, {
        minimumInterval: 1, // 1 second
        stopOnTerminate: false,
        startOnBoot: true,
      });

      // Set up audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
      });

      // Configure playback info
      if (sound) {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        // Set metadata for lock screen
        await Audio.setAudioModeAsync({
          androidImplementation: "MediaPlayer",
        });
      }
    } catch (error) {
      console.error("Error setting up remote controls:", error);
    }
  };

  const cleanupRemoteControls = async () => {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_AUDIO_TASK);
    } catch (error) {
      console.error("Error cleaning up remote controls:", error);
    }
  };

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
      });
    } catch (error) {
      console.error("Error setting up audio mode:", error);
    }
  };

  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
  };

  const handleAppStateChange = async (nextAppState) => {
    if (
      appStateRef.current === "active" &&
      nextAppState.match(/inactive|background/)
    ) {
      // App is going to background
      await savePlaybackState();
    } else if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      // App is coming to foreground
      await loadPlaybackState();
    }
    appStateRef.current = nextAppState;
  };

  const cleanupAudio = async () => {
    if (sound) {
      await savePlaybackState();
      await sound.unloadAsync();
    }
  };

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

  useEffect(() => {
    updateRemainingTime();
  }, [position, duration, playbackSpeed]);

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
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: false,
          positionMillis: savedPositionRef.current,
          progressUpdateIntervalMillis: 1000,
          staysActiveInBackground: true,
          isLooping: false,
        },
        onPlaybackStatusUpdate
      );

      // Configure audio session for the new sound
      await configureAudioSession(newSound, book);

      // Set up interruption handling
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          savePlaybackState();
        }
        onPlaybackStatusUpdate(status);
      });

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

  const configureAudioSession = async (sound, book) => {
    try {
      // Set metadata for lock screen and control center
      await Audio.setAudioModeAsync({
        androidImplementation: "MediaPlayer",
      });

      if (Platform.OS === "ios") {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          interruptionModeIOS: 1,
        });
      } else {
        // Android-specific configuration
        await Audio.setAudioModeAsync({
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error("Error configuring audio session:", error);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);

      // Save position periodically during playback
      if (status.isPlaying) {
        savedPositionRef.current = status.positionMillis;
        AsyncStorage.setItem(
          "lastPlaybackPosition",
          status.positionMillis.toString()
        ).catch((error) => console.error("Error saving position:", error));
      }
    }
  };

  const loadPlaybackState = async () => {
    try {
      const savedPosition = await AsyncStorage.getItem("lastPlaybackPosition");
      if (savedPosition && sound) {
        const positionMillis = parseInt(savedPosition, 10);
        await sound.setPositionAsync(positionMillis);
        setPosition(positionMillis);
      }
    } catch (error) {
      console.error("Error loading playback state:", error);
    }
  };

  const togglePlayback = async () => {
    if (sound) {
      try {
        if (isPlaying) {
          await sound.pauseAsync();
          await savePlaybackState();
        } else {
          await sound.playAsync();
          // Update remote control info when playing
          await updateRemoteControl();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error("Error toggling playback:", error);
      }
    }
  };

  const updateRemoteControl = async () => {
    try {
      if (book) {
        // Update now playing info
        await Audio.setAudioModeAsync({
          androidImplementation: "MediaPlayer",
          playsInSilentModeIOS: true,
        });
      }
    } catch (error) {
      console.error("Error updating remote control:", error);
    }
  };

  const seekAudio = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
      setPosition(value);
    }
  };

  const jumpAudio = async (seconds) => {
    if (sound) {
      const newPosition = position + seconds * 1000;
      const clampedPosition = Math.max(0, Math.min(newPosition, duration));
      await sound.setPositionAsync(clampedPosition);
      setPosition(clampedPosition);
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

  const updateRemainingTime = () => {
    const remainingMilliseconds = duration - position;
    const adjustedRemainingMilliseconds = remainingMilliseconds / playbackSpeed;
    const hours = Math.floor(adjustedRemainingMilliseconds / 3600000);
    const minutes = Math.floor(
      (adjustedRemainingMilliseconds % 3600000) / 60000
    );
    const seconds = Math.floor((adjustedRemainingMilliseconds % 60000) / 1000);
    setRemainingTime(`${hours}h ${minutes}m ${seconds}s`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#4A90E2" />
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
      <StatusBar style="light" />
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
          minimumTrackTintColor="#4A90E2"
          maximumTrackTintColor="#8E8E93"
          thumbTintColor="#4A90E2"
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        <Text style={styles.remainingTime}>Remaining: {remainingTime}</Text>
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => jumpAudio(-10)}
          >
            <MaterialIcons name="replay-10" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={48}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => jumpAudio(10)}
          >
            <MaterialIcons name="forward-10" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.speedContainer}>
          <DropDownPicker
            open={openSpeed}
            value={playbackSpeed}
            items={[
              { label: "0.75x", value: 0.75 },
              { label: "1x", value: 1 },
              { label: "1.25x", value: 1.25 },
              { label: "1.5x", value: 1.5 },
              { label: "2x", value: 2 },
            ]}
            setOpen={setOpenSpeed}
            setValue={setPlaybackSpeed}
            onChangeValue={(value) => changePlaybackSpeed(value)}
            style={styles.speedPicker}
            textStyle={styles.speedPickerText}
            dropDownContainerStyle={styles.speedPickerDropdown}
            labelStyle={styles.speedPickerLabel}
            arrowIconStyle={styles.speedPickerArrow}
            tickIconStyle={styles.speedPickerTick}
            listItemContainerStyle={styles.speedPickerItem}
            listItemLabelStyle={styles.speedPickerItemLabel}
            selectedItemContainerStyle={styles.speedPickerSelectedItem}
            selectedItemLabelStyle={styles.speedPickerSelectedItemLabel}
            placeholder="Speed"
            zIndex={1000}
          />
        </View>
        <Text style={styles.footer}>Made by Dinujaya Sandaruwan</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1931",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  cover: {
    width: Math.min(width * 0.7, 300),
    height: Math.min(width * 0.7, 300),
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
    color: "#B0B0B0",
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
    marginBottom: 5,
  },
  timeText: {
    color: "#B0B0B0",
  },
  remainingTime: {
    color: "#4A90E2",
    fontSize: 16,
    marginBottom: 20,
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
    backgroundColor: "#4A90E2",
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  speedContainer: {
    // flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // width: "100%",
    marginBottom: 20,
    zIndex: 1000,
  },
  speedPicker: {
    backgroundColor: "#1E3A5F",
    borderColor: "#4A90E2",
    borderWidth: 2,
    borderRadius: 10,

    width: 270,
  },
  speedPickerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  speedPickerDropdown: {
    backgroundColor: "#1E3A5F",
    borderColor: "#4A90E2",
    borderWidth: 2,
    borderRadius: 10,
    width: 270,
  },
  speedPickerLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  speedPickerArrow: {
    tintColor: "#4A90E2",
  },
  speedPickerTick: {
    tintColor: "#4A90E2",
  },
  speedPickerItem: {
    justifyContent: "center",
    height: 40,
    width: 270,
  },
  speedPickerItemLabel: {
    color: "#fff",
    fontSize: 16,
  },
  speedPickerSelectedItem: {
    backgroundColor: "#4A90E2",
  },
  speedPickerSelectedItemLabel: {
    color: "#fff",
    fontWeight: "bold",
  },
  loadingText: {
    color: "#fff",
    marginTop: 20,
  },
  errorText: {
    color: "#FF6B6B",
    textAlign: "center",
  },
  footer: {
    color: "#6a8caf",
    fontSize: 12,
    textAlign: "center",
    paddingBottom: 10,
  },
});

export default AudioPlayerPage;
