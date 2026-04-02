import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { API_BASE_URL } from "../config";

const resourceTypes = ["video", "pdf", "youtube", "pyq", "note"];

const AddResourceScreen = ({ navigation }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("note");
  const [loading, setLoading] = useState(false);

  const handleAddResource = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/resources`, {
        title,
        description,
        link,
        type,
      });

      Alert.alert("Success", "Resource added successfully!");
      setTitle("");
      setDescription("");
      setLink("");
      setType("note");
      navigation.goBack();
    } catch (error) {
      console.error("Add resource error:", error.message);
      Alert.alert("Error", "Failed to add resource. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Add New Resource</Text>

      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter title"
        placeholderTextColor="#888"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Enter description"
        placeholderTextColor="#888"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Link</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter link"
        placeholderTextColor="#888"
        value={link}
        onChangeText={setLink}
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={type}
          onValueChange={(itemValue) => setType(itemValue)}
          style={styles.picker}
        >
          {resourceTypes.map((t) => (
            <Picker.Item key={t} label={t.toUpperCase()} value={t} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleAddResource}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Adding..." : "Add Resource"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f6fa",
    flexGrow: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    color: "#444",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: "#5a3ff6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});

export default AddResourceScreen;
