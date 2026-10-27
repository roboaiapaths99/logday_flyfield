import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

// Screens
import OrganizationSelectionScreen from '../screens/OrganizationSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import StartDayScreen from '../screens/StartDayScreen';
import StartVisitScreen from '../screens/StartVisitScreen';
import ActiveVisitScreen from '../screens/ActiveVisitScreen';
import TimelineScreen from '../screens/TimelineScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import LeaveScreen from '../screens/LeaveScreen';
import PayslipsScreen from '../screens/PayslipsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HRMSOnboardingScreen from '../screens/HRMSOnboardingScreen';
import HRMSExitClearanceScreen from '../screens/HRMSExitClearanceScreen';
import FaceEnrollmentScreen from '../screens/FaceEnrollmentScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    const { user, organization, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                <ActivityIndicator size="large" color="#004B87" />
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#F8FAFC' },
            }}
        >
            {user ? (
                user.needs_face_enrollment ? (
                    <Stack.Screen
                        name="FaceEnrollment"
                        component={FaceEnrollmentScreen}
                        initialParams={{ initialEnrollment: true }}
                    />
                ) : (
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        <Stack.Screen name="StartDay" component={StartDayScreen} />
                        <Stack.Screen name="StartVisit" component={StartVisitScreen} />
                        <Stack.Screen name="ActiveVisit" component={ActiveVisitScreen} />
                        <Stack.Screen name="Timeline" component={TimelineScreen} />
                        <Stack.Screen name="Expenses" component={ExpensesScreen} />
                        <Stack.Screen name="LeaveRequest" component={LeaveScreen} />
                        <Stack.Screen name="HRMSPayslips" component={PayslipsScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="HRMSOnboarding" component={HRMSOnboardingScreen} />
                        <Stack.Screen name="HRMSExitClearance" component={HRMSExitClearanceScreen} />
                        <Stack.Screen name="FaceEnrollment" component={FaceEnrollmentScreen} />
                    </>
                )
            ) : !organization ? (
                <Stack.Screen name="OrganizationSelection" component={OrganizationSelectionScreen} />
            ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
}
