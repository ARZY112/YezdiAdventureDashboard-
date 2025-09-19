import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const MusicControls = ({ accentColor }) => {
  const [isPlaying, setIsPlaying] = useState(false); // Start with nothing playing
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState(null); // No song initially

  const progressAnimation = useSharedValue(0);

  // Only update timer when actually playing
  useEffect(() => {
    let interval;
    if (isPlaying && currentSong) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          const newTime = prev + 1;
          progressAnimation.value = withTiming(newTime / duration, { duration: 1000 });
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentSong, duration]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    if (!isPlaying || !currentSong) {
      return { width: '0%' };
    }
    const width = interpolate(progressAnimation.value, [0, 1], [0, 100]);
    return {
      width: `${width}%`,
    };
  });

  const formatTime = (seconds) => {
    if (!seconds || !isPlaying) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (!currentSong) {
      // Start playing a song
      setCurrentSong({
        title: 'Solar Sailer',
        artist: 'Daft Punk',
      });
      setCurrentTime(0);
      setDuration(247);
      progressAnimation.value = 0;
    }
    setIsPlaying(!isPlaying);
  };

  const skipPrevious = () => {
    if (currentSong) {
      setCurrentTime(0);
      progressAnimation.value = withTiming(0, { duration: 200 });
    }
  };

  const skipNext = () => {
    if (currentSong) {
      setCurrentTime(0);
      progressAnimation.value = withTiming(0, { duration: 200 });
      setIsPlaying(true);
    }
  };

  const stopMusic = () => {
    setIsPlaying(false);
    setCurrentSong(null);
    setCurrentTime(0);
    setDuration(0);
    progressAnimation.value = withTiming(0, { duration: 200 });
  };

  return (
    <View style={styles.container}>
      {/* Song Info - Only show when playing */}
      {currentSong ? (
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>
      ) : (
        <View style={styles.songInfo}>
          <Text style={styles.noMusicText}>No music playing</Text>
        </View>
      )}

      {/* Progress Bar - Only show when playing */}
      {currentSong ? (
        <View style={styles.progressContainer}>
          <Text style={styles.timeLabel}>
            {formatTime(currentTime)}
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { backgroundColor: accentColor },
                  animatedProgressStyle
                ]} 
              />
            </View>
          </View>
          <Text style={styles.timeLabel}>
            {formatTime(duration)}
          </Text>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          <View style={styles.emptyProgress} />
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, !currentSong && styles.controlButtonDisabled]}
          onPress={skipPrevious}
          disabled={!currentSong}
        >
          <Ionicons name="play-skip-back" size={20} color={currentSong ? "#FFFFFF" : "#333333"} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.playButton, { borderColor: accentColor }]}
          onPress={togglePlayPause}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={24} 
            color={accentColor} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, !currentSong && styles.controlButtonDisabled]}
          onPress={skipNext}
          disabled={!currentSong}
        >
          <Ionicons name="play-skip-forward" size={20} color={currentSong ? "#FFFFFF" : "#333333"} />
        </TouchableOpacity>
      </View>

      {/* Additional Info - Only show when connected */}
      {currentSong && (
        <View style={styles.additionalInfo}>
          <View style={styles.volumeContainer}>
            <Ionicons name="volume-medium" size={14} color="#666666" />
            <View style={styles.volumeBar}>
              <View style={[styles.volumeFill, { backgroundColor: accentColor, width: '70%' }]} />
            </View>
          </View>
          
          <TouchableOpacity onPress={stopMusic} style={styles.stopButton}>
            <Ionicons name="stop" size={14} color="#FF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 120,
  },
  songInfo: {
    marginBottom: 10,
    minHeight: 32,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  artistName: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  noMusicText: {
    color: '#666666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
    minHeight: 20,
  },
  emptyProgress: {
    flex: 1,
    height: 3,
    backgroundColor: '#333333',
    borderRadius: 1.5,
  },
  timeLabel: {
    color: '#CCCCCC',
    fontSize: 10,
    fontFamily: 'monospace',
    minWidth: 30,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: '#333333',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 10,
  },
  controlButton: {
    padding: 6,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  volumeBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#333333',
    borderRadius: 1,
    overflow: 'hidden',
    maxWidth: 50,
  },
  volumeFill: {
    height: '100%',
    borderRadius: 1,
  },
  stopButton: {
    padding: 4,
  },
});

export default MusicControls;
