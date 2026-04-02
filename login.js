import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function Login({ api, onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});
  const [authLoading, setAuthLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (isSignup && !name) newErrors.name = 'Name is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    
    setAuthLoading(true);
    try {
      const endpoint = isSignup ? '/auth/register' : '/auth/login';
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      if (isSignup) formData.append('name', name);

      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      onLoginSuccess(response.data.user, response.data.access_token);
      setErrors({});
      setEmail('');
      setPassword('');
      setName('');
    } catch (error) {
      const message = error.response?.data?.detail || 'Authentication failed';
      Alert.alert('Error', message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <Animated.View style={styles.card} entering={FadeIn.duration(350)}>
        <View style={styles.loginHeader}>
          <MaterialCommunityIcons name={isSignup ? 'account-plus' : 'login'} size={wp(6)} color="#4F46E5" />
          <Text style={styles.sectionTitle}>{isSignup ? 'Create Account' : 'Welcome Back'}</Text>
        </View>
        <Text style={styles.loginSubtitle}>
          {isSignup ? 'Join FocusMate to start your study journey' : 'Sign in to continue your study journey'}
        </Text>
        
        <View style={styles.form}>
          {isSignup && (
            <View>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>
          )}
          
          <View>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
          
          <View>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>
          
          <TouchableOpacity
            style={[styles.button, authLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>{isSignup ? 'Create Account' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.linkText}>
              {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: wp(5),
    backgroundColor: '#F5F3FF',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: wp(4),
    padding: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: wp(2),
    elevation: 3,
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1),
  },
  sectionTitle: {
    fontSize: wp(5),
    fontWeight: '600',
    color: '#1F2937',
  },
  loginSubtitle: {
    fontSize: wp(3.5),
    color: '#6B7280',
    marginBottom: hp(2),
    lineHeight: wp(5),
  },
  form: {
    gap: hp(2),
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: wp(3),
    padding: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    fontSize: wp(4),
  },
  inputError: {
    borderColor: '#F87171',
  },
  errorText: {
    fontSize: wp(3),
    color: '#F87171',
    marginBottom: hp(1),
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: wp(3),
    padding: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp(6),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFF',
    fontSize: wp(4),
    fontWeight: '500',
  },
  linkText: {
    fontSize: wp(3.5),
    color: '#4F46E5',
    textAlign: 'center',
    marginTop: hp(1),
  },
});
