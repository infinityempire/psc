/**
 * PSC - מחשבון תעריפי תחבורה ציבורית
 * לוגיקת חישוב טהורה - מאפשרת שימוש חוזר בטסטים ובממשק
 */
function computeTransportFare(params) {
    // 1. פירוק ואיפוס מוחלט של ה-State למניעת זליגת מצב (State Leak)
    const distance = Number(params.distance) || 0;
    const ticketType = params.ticket_type || 'single';
    const profile = params.profile || 'regular';
    const isPeriphery = Boolean(params.is_periphery);
    const includesRail = Boolean(params.includes_rail);

    let baseFare = 0;

    // 2. חישוב מחיר בסיס לפי סוג כרטיס ומרחק
    if (ticketType === 'single') {
        if (distance <= 15) {
            baseFare = 6.00;
        } else if (distance <= 40) {
            baseFare = 12.00;
        } else if (distance <= 75) {
            baseFare = 17.00;
        } else {
            baseFare = 28.00;
        }
    } else if (ticketType === 'monthly') {
        if (!includesRail) {
            baseFare = (distance <= 40) ? 99.00 : 236.00;
        } else {
            baseFare = (distance <= 40) ? 255.00 : 630.00;
        }
    }

    // 3. חישוב הנחת פרופיל
    let profileDiscount = 0;
    if (profile === 'senior_75') {
        profileDiscount = 1.00;
    } else if (['youth', 'student_extended', 'senior_67_74', 'social_eligible'].includes(profile)) {
        profileDiscount = 0.50;
    } else if (profile === 'student_regular') {
        profileDiscount = 0.33;
    }

    // 4. חישוב הנחת פריפריה / צדק תחבורתי
    const peripheryDiscount = isPeriphery ? 0.33 : 0.00;

    // 5. קביעת ההנחה הגבוהה ביותר (ללא כפל הנחות שגוי)
    const appliedDiscount = Math.max(profileDiscount, peripheryDiscount);

    // 6. חישוב מחיר סופי
    const finalFare = baseFare * (1 - appliedDiscount);

    return {
        baseFare: baseFare,
        profileDiscount: profileDiscount,
        peripheryDiscount: peripheryDiscount,
        appliedDiscount: appliedDiscount,
        finalFare: Math.round(finalFare * 100) / 100
    };
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeTransportFare };
}
