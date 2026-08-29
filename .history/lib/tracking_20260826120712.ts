export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    console.log(`Event tracked: ${eventName}`, properties);
};
