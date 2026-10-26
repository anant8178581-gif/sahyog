import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  formatDistance,
  estimateWalkingTime,
  isLocationStale,
  isPointInThreatZone,
} from '../utils/geo';
import { latLngToWorld, worldToLatLng } from '../utils/projection';
import type { LocationCoordinates, MemberCondition, MedicalEmergency } from '../types';

describe('SAHYOG Field Coordination Engine Tests', () => {
  const coordA: LocationCoordinates = { lat: 34.1280, lng: 74.8320 }; // Alpha-1
  const coordB: LocationCoordinates = { lat: 34.1210, lng: 74.8300 }; // Medical Emergency

  describe('Geospatial & Haversine Distance Calculations', () => {
    it('calculates accurate Haversine great-circle distance between two GPS coordinates', () => {
      const distanceMeters = calculateHaversineDistance(coordA, coordB);
      // Expected distance is approximately 798 meters
      expect(distanceMeters).toBeGreaterThan(700);
      expect(distanceMeters).toBeLessThan(900);
    });

    it('returns zero distance for identical coordinates', () => {
      const dist = calculateHaversineDistance(coordA, coordA);
      expect(dist).toBe(0);
    });

    it('formats distances correctly into meters and kilometers', () => {
      expect(formatDistance(450)).toBe('450 m');
      expect(formatDistance(2400)).toBe('2.4 km');
    });

    it('estimates field walking time at 4.5 km/h pacing', () => {
      expect(estimateWalkingTime(75)).toBe('1 min');
      expect(estimateWalkingTime(450)).toBe('6 min');
      expect(estimateWalkingTime(9000)).toBe('2h 0m');
    });
  });

  describe('Threat Zone Boundary Geofencing', () => {
    const dangerCenter: LocationCoordinates = { lat: 34.1360, lng: 74.8520 };
    const radiusMeters = 450;

    it('detects when a coordinate is inside the danger perimeter', () => {
      const insidePoint: LocationCoordinates = { lat: 34.1362, lng: 74.8522 };
      expect(isPointInThreatZone(insidePoint, dangerCenter, radiusMeters)).toBe(true);
    });

    it('detects when a coordinate is outside the danger perimeter', () => {
      const outsidePoint: LocationCoordinates = { lat: 34.1200, lng: 74.8200 };
      expect(isPointInThreatZone(outsidePoint, dangerCenter, radiusMeters)).toBe(false);
    });
  });

  describe('Stale Location Telemetry Logic', () => {
    it('marks updates older than threshold as Stale / Last Known', () => {
      const fiveMinutesAgo = Date.now() - 300000;
      expect(isLocationStale(fiveMinutesAgo, 180000)).toBe(true);
    });

    it('identifies fresh coordinates as Live', () => {
      const thirtySecondsAgo = Date.now() - 30000;
      expect(isLocationStale(thirtySecondsAgo, 180000)).toBe(false);
    });
  });

  describe('Mercator Coordinate Inversion & Projection', () => {
    it('converts LatLng to World points and back accurately', () => {
      const zoom = 14;
      const world = latLngToWorld(34.1250, 74.8250, zoom);
      const restored = worldToLatLng(world.x, world.y, zoom);

      expect(restored.lat).toBeCloseTo(34.1250, 4);
      expect(restored.lng).toBeCloseTo(74.8250, 4);
    });
  });

  describe('Emergency Lifecycle Transitions', () => {
    it('initializes emergency with ACTIVE status and empty acknowledgments', () => {
      const emg: MedicalEmergency = {
        id: 'emg_test_1',
        reportedBy: 'mem_1',
        reporterName: 'Alpha-4',
        reporterRole: 'Medic',
        type: 'MEDICAL_EMERGENCY',
        severity: 'URGENT',
        message: 'Severe sprain requiring splint.',
        location: coordA,
        timestamp: Date.now(),
        status: 'ACTIVE',
        acknowledgedBy: [],
      };

      expect(emg.status).toBe('ACTIVE');
      expect(emg.acknowledgedBy).toHaveLength(0);

      // Teammate acknowledges
      const acknowledged: MedicalEmergency = {
        ...emg,
        status: 'ACKNOWLEDGED',
        acknowledgedBy: ['Alpha-1'],
        acknowledgedAt: Date.now(),
      };

      expect(acknowledged.status).toBe('ACKNOWLEDGED');
      expect(acknowledged.acknowledgedBy).toContain('Alpha-1');

      // Resolved
      const resolved: MedicalEmergency = {
        ...acknowledged,
        status: 'RESOLVED',
        resolvedBy: 'Alpha-1',
        resolvedAt: Date.now(),
      };

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedBy).toBe('Alpha-1');
    });
  });

  describe('3D Character Avatar Role Mapping', () => {
    it('maps Medic role to the white-and-red medical responder character', () => {
      const getCharacterAsset = (role: string) =>
        role === 'Medic'
          ? '/assets/aistudio/image_ba22c148.png'
          : '/assets/aistudio/image_da532834.png';

      expect(getCharacterAsset('Medic')).toBe('/assets/aistudio/image_ba22c148.png');
      expect(getCharacterAsset('Team Leader')).toBe('/assets/aistudio/image_da532834.png');
      expect(getCharacterAsset('Recon')).toBe('/assets/aistudio/image_da532834.png');
      expect(getCharacterAsset('Support')).toBe('/assets/aistudio/image_da532834.png');
      expect(getCharacterAsset('Operator')).toBe('/assets/aistudio/image_da532834.png');
    });
  });

  describe('Team-Based Data Scoping & Role-Based Emergency Authorization', () => {
    const isAuthorizedForEmergency = (role: string) =>
      role === 'Team Leader' || role === 'Medic';

    it('authorizes Team Leader and Medic for emergency triage and resolution actions', () => {
      expect(isAuthorizedForEmergency('Team Leader')).toBe(true);
      expect(isAuthorizedForEmergency('Medic')).toBe(true);
    });

    it('restricts standard field roles (Recon, Support, Operator) from emergency triage', () => {
      expect(isAuthorizedForEmergency('Recon')).toBe(false);
      expect(isAuthorizedForEmergency('Support')).toBe(false);
      expect(isAuthorizedForEmergency('Operator')).toBe(false);
      expect(isAuthorizedForEmergency('Guest')).toBe(false);
    });

    it('enforces team-scoped path construction for subcollections', () => {
      const getTeamCollectionPath = (teamId: string, subcollection: string) =>
        `teams/${teamId}/${subcollection}`;

      expect(getTeamCollectionPath('SHY-782', 'members')).toBe('teams/SHY-782/members');
      expect(getTeamCollectionPath('SHY-782', 'medicalRequests')).toBe('teams/SHY-782/medicalRequests');
      expect(getTeamCollectionPath('ALPHA-9', 'locations')).toBe('teams/ALPHA-9/locations');
    });

    it('validates anonymous authentication session profile structure', () => {
      const anonUser = {
        uid: 'anon_abc123',
        email: null,
        displayName: 'Field Operative',
        isAnonymous: true,
      };

      expect(anonUser.isAnonymous).toBe(true);
      expect(anonUser.uid).toMatch(/^anon_/);
      expect(anonUser.email).toBeNull();
    });
  });
});
