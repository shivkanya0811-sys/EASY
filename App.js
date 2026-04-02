import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    NavigationContainer,
    DefaultTheme,
} from '@react-navigation/native';
import {
    createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {
    createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    FlatList,
    Image,
    Switch
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {Linking } from 'react-native'; 
import RScreen from "./RScreen";



// --- Configuration ---

    
// 1. If using a *PHYSICAL PHONE, replace '10.0.2.2' with your **COMPUTER'S LOCAL WI-FI IP* //    (e.g., 'http://192.168.1.5:8082').
// 2. If using the *Android Emulator*, 'http://10.0.2.2:8082' is correct.
//const API_BASE_URL = 'http://10.118.103.17:8082'; // *Ensure this IP is correct for your setup*
const API_BASE_URL = Platform.OS === 'android' ? 'http://10.188.21.239:8000' : 'http://localhost:8000';


// Axios Instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Request interceptor for auth
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Contexts and Hooks ---

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Rooms Context
const RoomsContext = createContext();

export const useRooms = () => useContext(RoomsContext);

// Resources Context
const ResourcesContext = createContext();

export const useResources = () => useContext(ResourcesContext);

// Shared animation presets
const fade = {
  entering: FadeIn.duration(350),
  exiting: FadeOut.duration(200),
  layout: Layout.duration(350),
};

// Tab keys
const TabKeys = {
  HOME: 'home',
  ROOMS: 'rooms',
  RESOURCES: 'resources',
  COMMUNITY: 'community',
  PROFILE: 'profile',
};

// --- Auth Provider Component ---

const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [user, setUser] = useState(null);

    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        try {
            const form_data = new FormData();
            form_data.append('username', email); // FastAPI OAuth2 requires 'username'
            form_data.append('password', password);

            const response = await api.post('/auth/token', form_data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { access_token, user_data } = response.data;
            await AsyncStorage.setItem('userToken', access_token);
            setUserToken(access_token);
            setUser(user_data);
            Alert.alert('Success', 'Login successful!');
        } catch (error) {
            console.error('Login error:', error.response ? error.response.data : error.message);
            Alert.alert('Login Failed', error.code === 'ERR_NETWORK' ? 
                `Network Error. Check your IP/Port: ${API_BASE_URL}` : 
                (error.response?.data?.detail || 'Invalid credentials or server error.')
            );
            setUserToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(async (name, email, password) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/register', {
                name,
                email,
                password,
            });
            Alert.alert('Success', 'Account created! Please log in.');
            return true;
        } catch (error) {
            console.error('Registration error:', error.response ? error.response.data : error.message);
            Alert.alert('Registration Failed', error.code === 'ERR_NETWORK' ? 
                `Network Error. Check your IP/Port: ${API_BASE_URL}` : 
                (error.response?.data?.detail || 'Email already in use or server error.')
            );
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const logout = useCallback(async () => {
        setIsLoading(true);
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
        setUser(null);
        setIsLoading(false);
    }, []);

    const isLoggedIn = useCallback(async () => {
        try {
            setIsLoading(true);
            let token = await AsyncStorage.getItem('userToken');
            
            if (token) {
                // Verify token validity and fetch user details
                const meResponse = await api.get('/auth/me'); 
                setUser(meResponse.data);
                setUserToken(token);
            }
            
        } catch (e) {
            console.error('isLoggedIn error, token invalid or expired:', e.message);
            await AsyncStorage.removeItem('userToken');
            setUserToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        isLoggedIn();
    }, [isLoggedIn]);

    return (
        <AuthContext.Provider value={{ userToken, user, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
// Rooms Provider
const RoomsProvider = ({ children }) => {
  const [rooms, setRooms] = useState([
    { id: 1, title: 'DSA – Trees & Graphs', members: 8, focus: 50, tags: ['C++', 'GATE'], live: true },
    { id: 2, title: 'Calculus Crash Room', members: 12, focus: 35, tags: ['Math', 'First Year'], live: true },
    { id: 3, title: 'Python – ML Basics', members: 5, focus: 80, tags: ['Python', 'ML'], live: false },
  ]);

  const addRoom = useCallback((newRoomData) => {
    setRooms(prev => [
      ...prev,
      { ...newRoomData, id: Date.now(), members: 1, focus: 0, live: false }
    ]);
  }, []);

  return (
    <RoomsContext.Provider value={{ rooms, addRoom }}>
      {children}
    </RoomsContext.Provider>
  );
};
 
// Resources Provider
const ResourcesProvider = ({ children }) => {
  // Add a sample resource for initial population
  const [resources, setResources] = useState([
    { id: 1, title: 'Intro to React Native', description: 'Video series on component lifecycle.', type: 'video', link: 'https://www.youtube.com/playlist?list=PL4rCNVf93D-eR43o_s60u_V4hLp8tJ8G1' },
    { id: 2, title: 'Linear Algebra PYQs', description: 'Last 5 years of exam questions.', type: 'pyq', link: null },
    { id: 3, title: 'Data Structures Cheatsheet', description: 'Notes on common algorithms and complexities.', type: 'note', link: null },
  ]);

  const fetchResources = useCallback(async () => {
    try {
      // NOTE: This API call might fail if the server is not running or the endpoint is incorrect.
      const res = await axios.get(`${API_BASE_URL}/resources`);
      setResources(res.data || []);
    } catch (e) {
      console.log("Resource fetch error. Using local data as fallback:", e.message);
      // Fallback to local resources if fetch fails (already initialized with samples)
    }
  }, []);

  const addResource = useCallback(async (data) => {
    // 1. Prepare data for local state update (ensuring it has a 'resource_type' key for display logic)
    const newResource = { ...data, id: Date.now(), resource_type: data.type };
    
    // --- FIX: Ensure description and link are always sent as strings ("") if empty, not null ---
    const linkValue = data.link ? data.link.trim() : "";
    const descriptionValue = data.description ? data.description.trim() : "";
    
    // 2. Prepare data for API call (adding 'resource_type' in case the API expects it instead of 'type')
    const apiData = { 
        title: data.title.trim(),
        description: descriptionValue, // Send "" instead of null/undefined
        type: data.type, 
        link: linkValue, // Send "" instead of null
        resource_type: data.type, // Keep the duplicate field for safety
    };
    
    try {
      // Attempt to post to the API first
      await api.post('/resources', apiData); // Use the corrected apiData payload
      await fetchResources(); // Refresh from server
      Alert.alert('Success', 'Resource added successfully!');
    } catch (e) {
      console.error('Add resource API error. Falling back to local state:', e.response ? e.response.data : e.message);
      
      // FALLBACK: Add the resource directly to local state
      setResources(prev => [...prev, newResource]);
      
      // Notify user, but change the message to reflect potential API issue
      Alert.alert('Success (Local)', 'Resource added to the list. Note: The API call failed, so this resource is only saved locally for now.');
    }
  }, [fetchResources]);

  const refresh = fetchResources;

  return (
    <ResourcesContext.Provider value={{ resources, addResource, refresh }}>
      {children}
    </ResourcesContext.Provider>
  );
};


// Login and Register Screens (Enhanced with validation)

const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({ name: '', email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();

    const validateRegister = () => {
        const newErr = { name: '', email: '', password: '' };
        if (!name) newErr.name = 'Name is required';
        if (!email) newErr.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErr.email = 'Enter a valid email';
        if (!password) newErr.password = 'Password is required';
        else if (password.length < 6) newErr.password = 'Min 6 characters';
        setErrors(newErr);
        return Object.values(newErr).every(e => !e);
    };

    const handleRegister = async () => {
        if (!validateRegister()) return;
        
        setIsSubmitting(true);
        const success = await register(name, email, password);
        setIsSubmitting(false);

        if (success) {
            navigation.navigate('Login'); 
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.authContainer}>
                <Text style={styles.title}>Create Account</Text>
                
                <View>
                    <TextInput
                        style={[styles.input, errors.name ? styles.inputError : {}]}
                        placeholder="Name"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />
                    {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                </View>
                
                <View>
                    <TextInput
                        style={[styles.input, errors.email ? styles.inputError : {}]}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>
                
                <View>
                    <TextInput
                        style={[styles.input, errors.password ? styles.inputError : {}]}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
                
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleRegister} 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.secondaryButtonText}>Already have an account? Log In</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();

    const validateLogin = () => {
        const newErr = { email: '', password: '' };
        if (!email) newErr.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErr.email = 'Enter a valid email';
        if (!password) newErr.password = 'Password is required';
        else if (password.length < 6) newErr.password = 'Min 6 characters';
        setErrors(newErr);
        return Object.values(newErr).every(e => !e);
    };

    const handleLogin = async () => {
        if (!validateLogin()) return;
        setIsSubmitting(true);
        // The login function will automatically update the userToken state 
        // and trigger the navigation change in RootNavigator.
        await login(email, password); 
        setIsSubmitting(false);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.authContainer}>
                <Text style={styles.title}>Welcome Back</Text>
                
                <View>
                    <TextInput
                        style={[styles.input, errors.email ? styles.inputError : {}]}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>
                
                <View>
                    <TextInput
                        style={[styles.input, errors.password ? styles.inputError : {}]}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
                
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleLogin} 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Log In</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={() => navigation.navigate('Register')}
                >
                    <Text style={styles.secondaryButtonText}>Don't have an account? Sign Up</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};


// Create Room Screen
const CreateRoomScreen = () => {
  const navigation = useNavigation();
  const { addRoom } = useRooms();
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState({ title: '', tags: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateCreateRoom = () => {
    const newErr = { title: '', tags: '' };
    if (!title.trim()) newErr.title = 'Room title is required';
    if (!tagsInput.trim()) newErr.tags = 'At least one tag is required';
    setErrors(newErr);
    return Object.values(newErr).every(e => !e);
  };

  const handleCreateRoom = async () => {
    if (!validateCreateRoom()) return;
    setIsSubmitting(true);
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    const newRoom = { title: title.trim(), tags };
    addRoom(newRoom);
    Alert.alert('Success', 'Room created successfully!');
    navigation.goBack();
    setIsSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.authContainer}>
        <Text style={styles.title}>Create Study Room</Text>
        
        <View>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : {}]}
            placeholder="Room Title (e.g., DSA – Trees & Graphs)"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
        </View>
        
        <View>
          <TextInput
            style={[styles.input, errors.tags ? styles.inputError : {}]}
            placeholder="Tags (comma-separated, e.g., C++, GATE)"
            placeholderTextColor="#9CA3AF"
            value={tagsInput}
            onChangeText={setTagsInput}
          />
          {errors.tags ? <Text style={styles.errorText}>{errors.tags}</Text> : null}
        </View>
        
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleCreateRoom} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create Room</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Create Resource Screen
const CreateResourceScreen = () => {
  const navigation = useNavigation();
  const { addResource } = useResources();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState('note');
  const [link, setLink] = useState('');
  const [errors, setErrors] = useState({ title: '', type: '', link: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateCreateResource = () => {
    const newErr = { title: '', type: '', link: '' };
    if (!title.trim()) newErr.title = 'Title is required';
    if (!selectedType) newErr.type = 'Type is required';
    if (link.trim() && !/^https?:\/\/\S+$/.test(link.trim())) {
        // Simple URL validation
        newErr.link = 'Enter a valid URL or leave blank';
    }
    setErrors(newErr);
    return Object.values(newErr).every(e => !e);
  };

  const handleCreateResource = async () => {
    if (!validateCreateResource()) return;
    setIsSubmitting(true);
    const data = {
      title: title.trim(),
      description: description,
      type: selectedType,
      link: link
    };
    
    // NOTE: addResource now handles the API call and the local fallback
    await addResource(data);
    
    // Check if navigation back is appropriate. Since the alert is now in addResource, 
    // we should wait for the process to finish before navigating back.
    // We navigate back after the submission is done.
    setIsSubmitting(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.authContainer}>
        <Text style={styles.title}>Upload Resource</Text>
        
        <View>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : {}]}
            placeholder="Title (e.g., Mathematics Notes)"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
        </View>

        <View>
          <TextInput
            style={[styles.input, { height: hp(12) }]}
            placeholder="Description (optional)"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.cardSubtitle}>Type</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={selectedType}
              onValueChange={setSelectedType}
              style={styles.pickerInput}
            >
              <Picker.Item label="Note" value="note" />
              <Picker.Item label="Video" value="video" />
              <Picker.Item label="PYQ" value="pyq" />
            </Picker>
          </View>
          {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}
        </View>

        <View>
          <TextInput
            style={[styles.input, errors.link ? styles.inputError : {}]}
            placeholder="Link (optional, e.g., Google Drive or YouTube)"
            placeholderTextColor="#9CA3AF"
            value={link}
            onChangeText={setLink}
            keyboardType="url"
            autoCapitalize="none"
          />
          {errors.link ? <Text style={styles.errorText}>{errors.link}</Text> : null}
        </View>
        
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleCreateResource} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Upload Resource</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


// Header Component
const Header = ({ user }) => {
  const avatarUri = user?.avatar || `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(user?.name || 'user')}`;
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#4F46E5" />
        <Text style={styles.headerTitle}>FocusMate</Text>
      </View>
      <View style={styles.headerRight}>
        <MaterialCommunityIcons name="bell" size={20} color="#6B7280" />
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <Text style={styles.headerName}>{user?.name || 'User'}</Text>
      </View>
    </View>
  );
};

// Quote Card Component
const QuoteCard = () => {
  return (
    <Animated.View style={styles.card} entering={fade.entering}>
      <Text style={styles.cardSubtitle}>Today’s Motivation</Text>
      <Text style={styles.quoteText}>
        “Small progress is still progress. Set a 25-minute timer and start—your future self will thank you.”
      </Text>
    </Animated.View>
  );
};

// Stat Card Component (not used directly, but kept for reference)
const StatCard = ({ icon, label, value, sub }) => {
  return (
    <Animated.View style={styles.statCard} entering={fade.entering}>
      <View style={styles.statContent}>
        <View>
          <Text style={styles.cardSubtitle}>{label}</Text>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.cardSubtitle}>{sub}</Text>
        </View>
        <View style={styles.statIcon}>{icon}</View>
      </View>
    </Animated.View>
  );
};

// Home Tab Component
const HomeTab = ({ user, rooms, muted, setMuted, videoOff, setVideoOff }) => {
  return (
    <View style={styles.tabContainer}>
      <Header user={user} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Study Rooms</Text>
        <FlatList
          data={rooms}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <RoomCard room={item} muted={muted} setMuted={setMuted} videoOff={videoOff} setVideoOff={setVideoOff} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roomList}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.progressGrid}>
          <ProgressStat label="Daily" value={65} />
          <ProgressStat label="Weekly" value={72} />
          <ProgressStat label="Monthly" value={48} />
        </View>
      </View>
      <QuoteCard />
      <TipsCard />
    </View>
  );
};

// Rooms Tab Component
const RoomsTab = ({ rooms, roomQuery, setRoomQuery, tagFilter, setTagFilter, muted, setMuted, videoOff, setVideoOff }) => {
  const navigation = useNavigation();
  console.log("NAV:", navigation);
  const tags = ['All', 'C++', 'GATE', 'Math', 'Python', 'ML', 'History', 'OS', 'C', 'First Year'];

  return (
    <View style={styles.tabContainer}>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search rooms…"
          value={roomQuery}
          onChangeText={setRoomQuery}
        />
      </View>
      <View style={styles.filterContainer}>
        <MaterialCommunityIcons name="filter" size={20} color="#6B7280" />
        <View style={styles.picker}>
          <Picker
            selectedValue={tagFilter}
            onValueChange={setTagFilter}
            style={styles.pickerInput}
          >
            {tags.map(t => <Picker.Item key={t} label={t} value={t} />)}
          </Picker>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CreateRoom')}>
          <MaterialCommunityIcons name="plus-circle" size={16} color="#FFF" />
          <Text style={styles.buttonText}>Create Room</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <RoomCard room={item} navigation={navigation}  muted={muted} setMuted={setMuted} videoOff={videoOff} setVideoOff={setVideoOff} />}
        contentContainerStyle={styles.roomList}
      />
    </View>
  );
};

// Resources Tab Component
const ResourcesTab = () => {
  const navigation = useNavigation();
  const { resources, refresh } = useResources();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const resourceTypes = ["all", "video", "pyq", "note"];

  // Fetch all resources
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Update suggestions on typing
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      generateSuggestions();
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [searchQuery, resources]);

  const generateSuggestions = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return setSuggestions([]);

    const map = {};

    resources.forEach((item) => {
      // Use item.type if available, otherwise fallback to item.resource_type, then 'note'
      const t = (item.type || item.resource_type || "note").toLowerCase(); 
      const titleMatch = item.title?.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);

      if (titleMatch || descMatch) {
        if (!map[t]) map[t] = [];
        map[t].push(item);
      }
    });

    const list = Object.keys(map).map((type) => ({
      type,
      items: map[type].slice(0, 3),
    }));

    setSuggestions(list);
  };

  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return resources.filter((item) => {
      // Use item.type if available, otherwise fallback to item.resource_type, then 'note'
      const t = (item.type || item.resource_type || "note").toLowerCase();
      const searchMatch =
        q === "" ||
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);

      const typeMatch = filter === "all" || t === filter;

      return searchMatch && typeMatch;
    });
  }, [resources, searchQuery, filter]);

  const getIcon = (type) => {
    switch (type) {
      case "video":
        return <MaterialCommunityIcons name="video-outline" size={26} color="#4F46E5" />;
      case "pyq":
        return <MaterialCommunityIcons name="file-document-outline" size={24} color="#10B981" />;
      default:
        return <MaterialIcons name="notes" size={24} color="#6B7280" />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      
      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <MaterialIcons name="search" size={20} color="#6B7280" style={styles.searchIcon} />

          <TextInput
            style={styles.searchBar}
            placeholder="Search resources..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
            >
              <MaterialIcons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* SUGGESTIONS */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView style={styles.suggestionsList}>
              {suggestions.map((group) => (
                <View key={group.type} style={styles.suggestionTypeGroup}>
                  <TouchableOpacity
                    style={styles.suggestionTypeHeader}
                    onPress={() => {
                      setFilter(group.type);
                      setShowSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionTypeTitle}>
                      {group.type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>

                  {group.items.map((item, i) => (
                    <TouchableOpacity
                      key={item.id || i} // Use id if available, otherwise index
                      style={styles.suggestionItem}
                      onPress={() => {
                        setSearchQuery(item.title);
                        setShowSuggestions(false);
                      }}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.description && (
                          <Text style={styles.suggestionDesc} numberOfLines={1}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* FILTER ROW WITH UPLOAD BUTTON */}
      <View style={styles.filterRow}>
        <View style={[styles.filters, { flex: 1 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {resourceTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setFilter(type)}
                style={[styles.filterBtn, filter === type && styles.activeFilter]}
              >
                <Text
                  style={{
                    color: filter === type ? "#fff" : "#374151",
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CreateResource')}>
          <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
          <Text style={[styles.buttonText, { marginLeft: wp(1) }]}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* RESOURCES LIST */}
      <FlatList
        data={filteredResources}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())} // Use id for key
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const t = (item.type || item.resource_type || "note").toLowerCase();
          return (
            <View style={styles.card}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={styles.iconContainer}>{getIcon(t)}</View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>

                  {item.description && (
                    <Text style={styles.desc}>{item.description}</Text>
                  )}

                  {item.link && (
                    <TouchableOpacity
                      // Removed background color change from openButton style definition and put it inline
                      onPress={() => Linking.openURL(item.link).catch(err => {
                        console.error("Failed to open link:", err);
                        Alert.alert("Error", "Could not open the link. Please check the URL.");
                      })}
                      style={[styles.openButton, { backgroundColor: '#4F46E5' }]} 
                    >
                      <Text style={[styles.openText, { color: '#fff' }]}>Open {t.toUpperCase()}</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={16}
                        color="#fff" // Changed color to white for contrast
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};


// Community Tab Component
const CommunityTab = () => {
  const posts = [
    { id: 1, user: 'Nina', msg: 'Finished 3 Pomodoros for OS!', time: '2m' },
    { id: 2, user: 'Ray', msg: 'Anyone up for a late-night DSA sprint?', time: '12m' },
    { id: 3, user: 'Isha', msg: 'Shared a Calculus cheat sheet in Resources.', time: '25m' },
  ];

  return (
    <View style={styles.tabContainer}>
      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>Peer Motivation</Text>
        <View style={styles.postInputContainer}>
          <TextInput
            style={styles.postInput}
            placeholder="Share a win or ask a question…"
            multiline
          />
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={posts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
                    <Image source={{ uri: `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(item.user)}` }} style={styles.postAvatar} />
                    <Text style={styles.postUser}>{item.user} <Text style={styles.postTime}>• {item.time}</Text></Text>
                  </View>
            <Text style={styles.postText}>{item.msg}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

// Profile Tab Component
const ProfileTab = ({ user }) => {
  const { logout } = useAuth();
  const avatarUri = user?.avatar || `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(user?.name || 'user')}`;

  return (
    <View style={styles.tabContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileHeader}>
          <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
          <View>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.cardSubtitle}>Level 4 • 1800 XP</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.toggleContainer}>
          <ToggleRow label="Show motivational quotes" defaultChecked />
          <ToggleRow label="Enable study reminders" defaultChecked />
          <ToggleRow label="Dark mode (system)" />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.toggleContainer}>
          <ButtonGhost icon={<MaterialCommunityIcons name="cog" size={16} color="#6B7280" />}>Account Settings</ButtonGhost>
          <ButtonGhost icon={<MaterialCommunityIcons name="logout" size={16} color="#6B7280" />} onPress={logout}>
            Sign Out
          </ButtonGhost>
        </View>
      </View>
    </View>
  );
};

// Room Card Component
const RoomCard = ({ room, muted, setMuted, videoOff, setVideoOff }) => {
  const navigation = useNavigation(); 
  return (
    <Animated.View style={styles.card} entering={fade.entering}>
      
      <View style={styles.roomHeader}>
        <View>
          <Text style={styles.roomTitle}>{room.title}</Text>

          <Text style={styles.cardSubtitle}>
            {room.members} members • Focus {room.focus}%{' '}
            {room.live && <Text style={styles.liveBadge}>LIVE</Text>}
          </Text>

          <View style={styles.tagContainer}>
            {room.tags.map(t => (
              <Text key={t} style={styles.tag}>{t}</Text>
            ))}
          </View>
        </View>

        <View style={styles.roomControls}>
          <IconToggle
            on={!muted}
            onIcon={<MaterialCommunityIcons name="microphone" size={16} color="#4F46E5" />}
            offIcon={<MaterialCommunityIcons name="microphone-off" size={16} color="#6B7280" />}
            onToggle={() => setMuted(!muted)}
            label={muted ? 'Unmute' : 'Mute'}
          />

          <IconToggle
            on={!videoOff}
            onIcon={<MaterialCommunityIcons name="video" size={16} color="#4F46E5" />}
            offIcon={<MaterialCommunityIcons name="video-off" size={16} color="#6B7280" />}
            onToggle={() => setVideoOff(!videoOff)}
            label={videoOff ? 'Camera On' : 'Camera Off'}
          />
        </View>
      </View>

      <Progress value={room.focus} label="Room Focus" />

      <View style={styles.roomActions}>
        {/* ✅ FIXED */}
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate("RoomScreen", { room })}
        >
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Preview</Text>
        </TouchableOpacity>
      </View>

    </Animated.View>
  );
};

// Progress Component
const Progress = ({ value, label }) => {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.cardSubtitle}>{label}</Text>
        <Text style={styles.cardSubtitle}>{value}%</Text>
      </View>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: `${value}%` }]} entering={fade.entering} />
      </View>
    </View>
  );
};

// Progress Stat Component
const ProgressStat = ({ label, value }) => {
  return (
    <View style={styles.progressStat}>
      <View style={styles.progressHeader}>
        <Text style={styles.cardSubtitle}>{label}</Text>
        <Text style={styles.cardSubtitle}>{value}%</Text>
      </View>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: `${value}%` }]} entering={fade.entering} />
      </View>
    </View>
  );
};

// Icon Toggle Component
const IconToggle = ({ on, onIcon, offIcon, onToggle, label }) => {
  return (
    <TouchableOpacity style={[styles.iconToggle, on ? styles.iconToggleOn : {}]} onPress={onToggle}>
      {on ? onIcon : offIcon}
      <Text style={styles.iconToggleText}>{label}</Text>
    </TouchableOpacity>
  );
};

// Tips Card Component
const TipsCard = () => {
  const tips = [
    'Use 25-minute sprints, 5-minute breaks.',
    'Mute notifications during focus blocks.',
    'Share your goal in the Community tab.',
    'Pick a single topic per session.',
  ];

  return (
    <Animated.View style={styles.card} entering={fade.entering}>
      <Text style={styles.sectionTitle}>Productivity Tips</Text>
      {tips.map((tip, i) => (
        <Text key={i} style={styles.tipText}>• {tip}</Text>
      ))}
    </Animated.View>
  );
};

// Toggle Row Component
const ToggleRow = ({ label, defaultChecked = false }) => {
  const [isEnabled, setIsEnabled] = useState(defaultChecked);
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={isEnabled}
        onValueChange={setIsEnabled}
        trackColor={{ false: '#D1D5DB', true: '#4F46E5' }}
        thumbColor="#FFF"
      />
    </View>
  );
};

// Ghost Button Component
const ButtonGhost = ({ children, icon, onPress }) => {
  return (
    <TouchableOpacity style={styles.ghostButton} onPress={onPress}>
      {icon}
      <Text style={styles.ghostButtonText}>{children}</Text>
    </TouchableOpacity>
  );
};


// Navigation Setup

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const AppTabs = createBottomTabNavigator();

const AuthStackScreen = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
);

const AppTabsScreen = () => {
    const { user } = useAuth();
    const { rooms } = useRooms();
    const [roomQuery, setRoomQuery] = useState('');
    const [tagFilter, setTagFilter] = useState('All');
    const [muted, setMuted] = useState(true);
    const [videoOff, setVideoOff] = useState(true);

    const filteredRooms = useMemo(() => rooms.filter(r => {
        const matchesQuery = r.title.toLowerCase().includes(roomQuery.toLowerCase());
        const matchesTag = tagFilter === 'All' || r.tags.includes(tagFilter);
        return matchesQuery && matchesTag;
    }), [rooms, roomQuery, tagFilter]);

    return (
        <AppTabs.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    const icons = {
                        [TabKeys.HOME]: 'home',
                        [TabKeys.ROOMS]: 'account-group',
                        [TabKeys.RESOURCES]: 'bookshelf',
                        [TabKeys.COMMUNITY]: 'message',
                        [TabKeys.PROFILE]: 'account',
                    };
                    return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#4F46E5',
                tabBarInactiveTintColor: '#6B7280',
                tabBarStyle: styles.tabBar,
            })}
        >
            <AppTabs.Screen 
                name={TabKeys.HOME} 
                children={() => <HomeTab user={user} rooms={filteredRooms.slice(0, 3)} muted={muted} setMuted={setMuted} videoOff={videoOff} setVideoOff={setVideoOff} />} 
            />
            <AppTabs.Screen 
                name={TabKeys.ROOMS} 
                children={() => <RoomsTab rooms={filteredRooms} roomQuery={roomQuery} setRoomQuery={setRoomQuery} tagFilter={tagFilter} setTagFilter={setTagFilter} muted={muted} setMuted={setMuted} videoOff={videoOff} setVideoOff={setVideoOff} />} 
            />
            <AppTabs.Screen name={TabKeys.RESOURCES} component={ResourcesTab} />
            <AppTabs.Screen name={TabKeys.COMMUNITY} component={CommunityTab} />
            <AppTabs.Screen name={TabKeys.PROFILE} children={() => <ProfileTab user={user} />} />
        </AppTabs.Navigator>
    );
};

function RoomScreen({ route }) {
  const { room } = route.params;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
        Welcome to Room
      </Text>
      <Text>{room.title}</Text>
    </View>
  );
}
const MainStackScreen = () => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    <MainStack.Screen name="MainTabs" component={AppTabsScreen} />
    <MainStack.Screen name="CreateRoom" component={CreateRoomScreen} />
    <MainStack.Screen name="CreateResource" component={CreateResourceScreen} />
    <MainStack.Screen name="RoomScreen" component={RoomScreen} />
     <MainStack.Screen name="RScreen" component={RScreen} />
  </MainStack.Navigator>
);


const RootNavigator = ({ theme }) => {
    const { userToken, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={{ marginTop: hp(2), color: '#4F46E5' }}>Loading...</Text>
            </View>
        );
    }

    // This is the core logic: if userToken exists, show the main app (AppTabsScreen), otherwise show authentication (AuthStackScreen).
    return (
    <RoomsProvider>  
        <NavigationContainer theme={theme}>
            {userToken ? <MainStackScreen /> : <AuthStackScreen />}
        </NavigationContainer>
    </RoomsProvider>   
    
);
};


// Main App Component

export default function App() {
    const MyTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: '#F9FAFB',
            primary: '#4F46E5',
            card: '#FFFFFF',
            text: '#1F2937',
        },
    };

    return (
        <AuthProvider>
          <RoomsProvider>
            <ResourcesProvider>
              <RootNavigator theme={MyTheme} />
            </ResourcesProvider>
          </RoomsProvider>
        </AuthProvider>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
   container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: wp(4),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    authContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: wp(6),
    },
    title: {
        fontSize: wp(7),
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: hp(2),
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#FFFFFF',
        padding: wp(4),
        borderRadius: 8,
        fontSize: wp(4),
        marginBottom: hp(2),
        borderWidth: 1,
        borderColor: '#E5E7EB',
        color: '#1F2937',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        fontSize: wp(3.5),
        color: '#EF4444',
        marginTop: hp(0.5),
    },
    primaryButton: {
        backgroundColor: '#4F46E5',
        padding: wp(4),
        borderRadius: 8,
        alignItems: 'center',
        marginTop: hp(1),
        marginBottom: hp(2),
        height: hp(7),
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: wp(4.5),
        fontWeight: '600',
    },
    secondaryButton: {
        padding: wp(2),
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#4F46E5',
        fontSize: wp(4),
    },
    // Tab and component styles from reference code
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: wp(4),
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
    },
    headerTitle: {
        fontSize: wp(5),
        fontWeight: '600',
        color: '#1F2937',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
    },
    avatar: {
        width: wp(8),
        height: wp(8),
        borderRadius: wp(4),
    },
    headerName: {
        fontSize: wp(3.5),
        color: '#1F2937',
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(4),
        padding: wp(4),
        marginBottom: hp(2),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: wp(2),
        elevation: 3,
    },
    sectionTitle: {
        fontSize: wp(5),
        fontWeight: '600',
        color: '#1F2937',
    },
    cardSubtitle: {
        fontSize: wp(3.5),
        color: '#6B7280',
    },
    tabContainer: {
        flex: 1,
        padding: wp(4),
    },
    section: {
        marginBottom: hp(2),
    },
    roomList: {
        paddingBottom: hp(2),
        gap: wp(3),
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(3),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        marginBottom: hp(2),
    },
    searchIcon: {
        marginLeft: wp(3),
    },
    searchInput: {
        flex: 1,
        padding: wp(2.5),
        fontSize: wp(4),
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        marginBottom: hp(2),
    },
    picker: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(3),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    pickerInput: {
        fontSize: wp(4),
        padding: wp(2),
    },
    button: {
        backgroundColor: '#4F46E5',
        borderRadius: wp(3),
        padding: wp(3),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: wp(2),
    },
    resourceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(3),
        padding: wp(3),
        marginBottom: hp(1),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    resourceTitle: {
        fontSize: wp(4),
        fontWeight: '500',
        color: '#1F2937',
    },
    postInputContainer: {
        flexDirection: 'row',
        gap: wp(2),
        marginTop: hp(1),
    },
    postInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(3),
        padding: wp(2),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        fontSize: wp(4),
    },
    postCard: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(3),
        padding: wp(3),
        marginBottom: hp(1),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        marginBottom: hp(1),
    },
    postAvatar: {
        width: wp(6),
        height: wp(6),
        borderRadius: wp(3),
    },
    postUser: {
        fontSize: wp(3.5),
        fontWeight: '500',
        color: '#1F2937',
    },
    postTime: {
        fontSize: wp(3),
        color: '#6B7280',
    },
    postText: {
        fontSize: wp(4),
        color: '#1F2937',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(3),
    },
    profileAvatar: {
        width: wp(16),
        height: wp(16),
        borderRadius: wp(8),
    },
    profileName: {
        fontSize: wp(5),
        fontWeight: '600',
        color: '#1F2937',
    },
    toggleContainer: {
        gap: hp(1.5),
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleLabel: {
        fontSize: wp(4),
        color: '#1F2937',
    },
    ghostButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: wp(3),
        padding: wp(2),
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    ghostButtonText: {
        fontSize: wp(4),
        color: '#1F2937',
    },
    statCard: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(3),
        padding: wp(3),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    statContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statValue: {
        fontSize: wp(5),
        fontWeight: '600',
        color: '#1F2937',
        marginVertical: hp(0.5),
    },
    statIcon: {
        opacity: 0.7,
    },
    quoteText: {
        fontSize: wp(4),
        color: '#1F2937',
        lineHeight: wp(6),
    },
    progressGrid: {
        flexDirection: 'row',
        gap: wp(3),
    },
    progressStat: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: wp(3),
        padding: wp(2),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    progressContainer: {
        marginTop: hp(2),
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(0.5),
    },
    progressBar: {
        height: hp(1),
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: wp(2),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4F46E5',
        borderRadius: wp(2),
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(1),
    },
    roomTitle: {
        fontSize: wp(4.5),
        fontWeight: '600',
        color: '#1F2937',
    },
    liveBadge: {
        fontSize: wp(3),
        backgroundColor: 'rgba(22,163,74,0.1)',
        color: '#16A34A',
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.5),
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: 'rgba(22,163,74,0.3)',
    },
    tagContainer: {
        flexDirection: 'row',
        gap: wp(2),
        marginTop: hp(1),
    },
    tag: {
        fontSize: wp(3),
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: wp(2),
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.5),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    roomControls: {
        flexDirection: 'row',
        gap: wp(2),
    },
    roomActions: {
        flexDirection: 'row',
        gap: wp(2),
        marginTop: hp(2),
    },
    iconToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: wp(3),
        padding: wp(2),
    },
    iconToggleOn: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    iconToggleText: {
        fontSize: wp(3),
        color: '#1F2937',
    },
    tipText: {
        fontSize: wp(4),
        color: '#1F2937',
        marginTop: hp(0.5),
    },
    tabBar: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    list: {
        paddingBottom: hp(2),
    },
    filters: {
        flexDirection: "row",
        justifyContent: "center",
        padding: 10,
        backgroundColor: "#fff",
    },
    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#E5E7EB",
        margin: 5,
    },
    activeFilter: {
        backgroundColor: "#4F46E5",
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    pickerContainer: {
        marginBottom: hp(2),
    },
    // The previous 'card' style (general) is for the other tabs, this one for resources is different
    // card: { ... }, 
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    desc: {
        fontSize: 14,
        color: "#6B7280",
    },
    openButton: {
        marginTop: 10,
        // Removed backgroundColor and color from here for inline override
        padding: 8,
        borderRadius: 6,
        alignItems: "center",
        flexDirection: 'row', // Added for icon and text alignment
        justifyContent: 'center',
        gap: 5,
    },
    openText: {
        // Removed color from here
        fontWeight: "600",
    },
    searchContainer: {
        padding: 16,
        backgroundColor: "#F9FAFB",
    },
    searchInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchBar: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: "#1F2937",
    },
    suggestionsContainer: {
        marginTop: 8,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        maxHeight: 200,
    },
    suggestionsList: {
        maxHeight: 200,
    },
    suggestionTypeGroup: {
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    suggestionTypeHeader: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    suggestionTypeTitle: {
        fontWeight: "600",
        color: "#4F46E5",
        fontSize: 14,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F9FAFB",
    },
    suggestionContent: {
        gap: 4,
    },
    suggestionTitle: {
        fontWeight: "500",
        color: "#1F2937",
        fontSize: 15,
    },
    suggestionDesc: {
        color: "#6B7280",
        fontSize: 13,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
     
});