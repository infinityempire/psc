'use client';

import { useState, useMemo } from 'react';
import {
  calculateFare,
  findFareBand,
  isValidCombination,
  TRANSPORT_MODE_LABELS,
  CONTRACT_TYPE_LABELS,
  DISCOUNT_PROFILE_LABELS,
  type TransportMode,
  type ContractType,
  type DiscountProfile,
} from '@/lib/fares';

export default function Home() {
  const [distance, setDistance] = useState<string>('25');
  const [transportMode, setTransportMode] = useState<TransportMode>('bus_only');
  const [contractType, setContractType] = useState<ContractType>('single');
  const [discountProfile, setDiscountProfile] = useState<DiscountProfile>('regular');

  const distanceNum = parseFloat(distance) || 0;

  const fareResult = useMemo(() => {
    return calculateFare({
      distanceKm: distanceNum,
      transportMode,
      contractType,
      discountProfile,
    });
  }, [distanceNum, transportMode, contractType, discountProfile]);

  const fareBand = useMemo(() => {
    return findFareBand(distanceNum);
  }, [distanceNum]);

  const validation = useMemo(() => {
    return isValidCombination({
      distanceKm: distanceNum,
      transportMode,
      contractType,
      discountProfile,
    });
  }, [distanceNum, transportMode, contractType, discountProfile]);

  return (
    <main className="container">
      <header>
        <h1>מחשבון תחבורה ציבורית</h1>
        <p className="subtitle">
          חישוב מחיר נסיעה על בסיס מחירון משרד התחבורה
        </p>
      </header>

      <div className="calculator">
        <div className="form-group">
          <label htmlFor="distance">מרחק (ק&apos;&quot;מ)</label>
          <input
            id="distance"
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            min="0"
            step="0.1"
            placeholder="הזן מרחק בקילומטרים"
          />
          {fareBand && (
            <span className="band-label">
              מדרגת מחיר: {fareBand.label} ק&apos;&quot;מ
            </span>
          )}
        </div>

        <div className="form-group">
          <label>אמצעי תחבורה</label>
          <div className="radio-group">
            {(Object.keys(TRANSPORT_MODE_LABELS) as TransportMode[]).map((mode) => (
              <label key={mode} className="radio-label">
                <input
                  type="radio"
                  name="transportMode"
                  value={mode}
                  checked={transportMode === mode}
                  onChange={() => setTransportMode(mode)}
                />
                <span>{TRANSPORT_MODE_LABELS[mode]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>סוג כרטיס</label>
          <div className="radio-group">
            {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((contract) => (
              <label key={contract} className="radio-label">
                <input
                  type="radio"
                  name="contractType"
                  value={contract}
                  checked={contractType === contract}
                  onChange={() => setContractType(contract)}
                />
                <span>{CONTRACT_TYPE_LABELS[contract]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>פרופיל הנחה</label>
          <div className="radio-group">
            {(Object.keys(DISCOUNT_PROFILE_LABELS) as DiscountProfile[]).map((discount) => (
              <label key={discount} className="radio-label">
                <input
                  type="radio"
                  name="discountProfile"
                  value={discount}
                  checked={discountProfile === discount}
                  onChange={() => setDiscountProfile(discount)}
                />
                <span>{DISCOUNT_PROFILE_LABELS[discount]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="result">
          {!validation.valid ? (
            <div className="error">
              <p>{validation.reason}</p>
            </div>
          ) : (
            <>
              <p className="price-label">מחיר הנסיעה:</p>
              <p className="price">{fareResult.formatted}</p>
            </>
          )}
        </div>
      </div>

      <footer>
        <p>
          מקור: משרד התחבורה והבטיחות בדרכים | הרשות הארצית לתחבורה ציבורית
        </p>
        <p className="disclaimer">
          המחירים המוצגים הם על פי תעריפון רשמי ועשויים להשתנות.
          יש לוודא את המחיר הסופי מול נהג האוטובוס או באתר הרשמי.
        </p>
      </footer>
    </main>
  );
}
