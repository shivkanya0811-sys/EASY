import React, { useState, useEffect } from "react";
import { View, Text, Button } from "react-native";

function RScreen({ route }) {
  const { room } = route.params;

  const [seconds, setSeconds] = useState(1500); // 25 min
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer;
    if (isRunning && seconds > 0) {
      timer = setInterval(() => {
        setSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, seconds]);

  const formatTime = () => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22 }}>Room: {room.title}</Text>

      <Text style={{ fontSize: 40, marginVertical: 20 }}>
        {formatTime()}
      </Text>

      <Button title={isRunning ? "Pause" : "Start"} onPress={() => setIsRunning(!isRunning)} />
      <Button title="Reset" onPress={() => setSeconds(1500)} />
    </View>
  );
}

export default RScreen;