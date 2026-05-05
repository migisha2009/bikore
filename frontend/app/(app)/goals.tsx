import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { formatRwf } from '../../utils/format';
import api from '../../utils/api';

interface Goal {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  emoji: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  progress_percentage: number;
  group_name?: string;
  group_emoji?: string;
}

interface CreateGoalData {
  name: string;
  emoji: string;
  target_amount: string;
  target_date: string;
}

export default function GoalsScreen() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<CreateGoalData>({
    name: '',
    emoji: '🎯',
    target_amount: '',
    target_date: ''
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/goals');
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!formData.name.trim() || !formData.target_amount.trim() || !formData.target_date.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data } = await api.post('/goals', formData);
      setGoals(prev => [data, ...prev]);
      setCreateModalVisible(false);
      setFormData({ name: '', emoji: '🎯', target_amount: '', target_date: '' });
      Alert.alert('Success', 'Goal created successfully!');
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create goal');
    }
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal) return;

    try {
      const { data } = await api.put(`/goals/${editingGoal.id}`, {
        name: formData.name,
        emoji: formData.emoji,
        target_amount: formData.target_amount,
        target_date: formData.target_date
      });
      
      setGoals(prev => prev.map(goal => 
        goal.id === editingGoal.id ? data : goal
      ));
      
      setEditingGoal(null);
      setFormData({ name: '', emoji: '🎯', target_amount: '', target_date: '' });
      Alert.alert('Success', 'Goal updated successfully!');
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update goal');
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/goals/${goalId}`);
              setGoals(prev => prev.filter(goal => goal.id !== goalId));
              Alert.alert('Success', 'Goal deleted successfully!');
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          }
        }
      ]
    );
  };

  const handleUpdateProgress = async (goalId: string, amount: string) => {
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const { data } = await api.post(`/goals/${goalId}/progress`, { amount });
      
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? data : goal
      ));
      
      Alert.alert('Success', 'Progress updated successfully!');
    } catch (error) {
      console.error('Error updating progress:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update progress');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.forestGreen;
      case 'completed': return colors.success;
      case 'paused': return colors.mustard;
      default: return colors.textMid;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'target';
      case 'completed': return 'check-circle';
      case 'paused': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderGoalCard = (goal: Goal) => {
    const isCompleted = goal.status === 'completed';
    const progressPercentage = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0;

    return (
      <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalEmoji}>{goal.emoji}</Text>
            <View style={styles.goalDetails}>
              <Text style={styles.goalName}>{goal.name}</Text>
              {goal.group_name && (
                <Text style={styles.goalGroup}>
                  {goal.group_emoji} {goal.group_name}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.goalStatus}>
            <MaterialCommunityIcons 
              name={getStatusIcon(goal.status)} 
              size={16} 
              color={getStatusColor(goal.status)} 
            />
          </View>
        </View>
        
        <View style={styles.goalAmount}>
          <Text style={styles.goalTarget}>{formatRwf(goal.target_amount)}</Text>
          <Text style={styles.goalCurrent}>{formatRwf(goal.current_amount)}</Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>
      </View>

      <View style={styles.goalFooter}>
        <Text style={styles.goalDate}>
          Target: {formatDate(goal.target_date)}
        </Text>
        <Text style={[styles.goalStatus, { color: getStatusColor(goal.status) }]}>
          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
        </Text>
      </View>

      {!isCompleted && (
        <View style={styles.goalActions}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => handleUpdateProgress(goal.id)}
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.forestGreen} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditingGoal(goal)}
          >
            <MaterialCommunityIcons name="pencil" size={16} color={colors.textMid} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteGoal(goal.id)}
          >
            <MaterialCommunityIcons name="trash-can" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading goals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Savings Goals</Text>
        <Text style={styles.headerSub}>Track your personal savings targets</Text>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setCreateModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
        <Text style={styles.createButtonText}>Create Goal</Text>
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {goals.map(renderGoalCard)}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Savings Goal</Text>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Goal Name</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={setFormData}
                placeholder="e.g., Emergency Fund"
                maxLength={50}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Amount (Rwf)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.target_amount}
                onChangeText={setFormData}
                placeholder="100000"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  // Date picker would go here
                  Alert.alert('Date Picker', 'Date picker functionality would be implemented here');
                }}
              >
                <Text style={styles.dateText}>
                  {formData.target_date || 'Select target date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCreateModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateGoal}
            >
              <Text style={styles.createButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal
        visible={!!editingGoal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingGoal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingGoal(null)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Savings Goal</Text>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Goal Name</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={setFormData}
                placeholder="e.g., Emergency Fund"
                maxLength={50}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Amount (Rwf)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.target_amount}
                onChangeText={setFormData}
                placeholder="100000"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  Alert.alert('Date Picker', 'Date picker functionality would be implemented here');
                }}
              >
                <Text style={styles.dateText}>
                  {formData.target_date || 'Select target date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditingGoal(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleUpdateGoal}
            >
              <Text style={styles.createButtonText}>Update Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forestGreen,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.white,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginTop: 100,
  },
  goalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalInfo: {
    flex: 1,
  },
  goalEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  goalDetails: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 4,
  },
  goalGroup: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginTop: 4,
  },
  goalStatus: {
    alignItems: 'flex-end',
  },
  goalAmount: {
    alignItems: 'flex-end',
  },
  goalTarget: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textDecorationLine: 'line-through',
  },
  goalCurrent: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  progressBarContainer: {
    marginVertical: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.beigeDeep,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.forestGreen,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textMid,
    textAlign: 'center',
    marginTop: 4,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalDate: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  updateButton: {
    backgroundColor: colors.forestGreen,
    borderRadius: 20,
    padding: 8,
  },
  editButton: {
    backgroundColor: colors.beige,
    borderRadius: 20,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: 20,
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.beigeDeep,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.beige,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
  },
});
