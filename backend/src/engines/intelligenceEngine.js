const { v4: uuidv4 } = require('uuid');

const REGIONS = [
  { name: 'Red Sea Corridor', lat: 14.0, lng: 43.0, radius: 400 },
  { name: 'South China Sea', lat: 18.0, lng: 115.0, radius: 500 },
  { name: 'North Atlantic', lat: 45.0, lng: -35.0, radius: 700 },
  { name: 'Strait of Hormuz', lat: 26.5, lng: 56.2, radius: 250 },
  { name: 'Panama Canal', lat: 9.3, lng: -79.9, radius: 200 },
  { name: 'European Ports', lat: 51.5, lng: 3.5, radius: 300 },
  { name: 'US West Coast', lat: 34.0, lng: -118.0, radius: 400 }
];

const TEMPLATES = [
  { type: 'weather', severity: 'High', templates: ['Category 4 Typhoon forming near {region}', 'Severe cyclonic storm detected in {region}'] },
  { type: 'weather', severity: 'Medium', templates: ['Heavy fog delaying operations in {region}', 'Adverse weather impacting routes through {region}'] },
  { type: 'geopolitical', severity: 'High', templates: ['Naval blockade simulated in {region}', 'Escalating tensions closing airspace over {region}'] },
  { type: 'strike', severity: 'Medium', templates: ['Dockworkers announce wildcat strike at {region}', 'Union disputes causing major backlog in {region}'] },
  { type: 'operational', severity: 'High', templates: ['Critical infrastructure failure at {region}', 'Vessel collision causing total blockage in {region}'] }
];

class IntelligenceEngine {
  constructor() {
    this.newsFeed = [];
    this.activeAutonomousDisruptions = [];
  }

  tick() {
    // ~5% chance per tick to spawn a new global event
    const shouldSpawn = Math.random() < 0.05; 
    
    const now = Date.now();
    let expiredIds = [];
    
    this.activeAutonomousDisruptions = this.activeAutonomousDisruptions.filter(d => {
      if (now > d.expiresAt) {
        expiredIds.push(d.id);
        
        const newsItem = this.newsFeed.find(n => n.disruptionId === d.id);
        if (newsItem) {
           this.newsFeed.unshift({
             id: uuidv4(),
             type: 'recovery',
             title: `[RESOLVED] ${d.name.replace('forming near ', '').replace('detected in ', '')} threat has subsided.`,
             impact: 'Low',
             timestamp: now,
           });
        }
        return false; // remove
      }
      return true; // keep
    });

    let newDisruption = null;
    if (shouldSpawn && this.activeAutonomousDisruptions.length < 3) {
       const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
       const templateDef = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
       const title = templateDef.templates[Math.floor(Math.random() * templateDef.templates.length)].replace('{region}', region.name);
       
       const disruptionId = uuidv4();
       const lifespanMs = Math.floor(Math.random() * 120000) + 60000; // 1 to 3 minutes
       
       newDisruption = {
         id: disruptionId,
         type: templateDef.type,
         name: title,
         lat: region.lat + (Math.random() * 4 - 2),
         lng: region.lng + (Math.random() * 4 - 2),
         radius: region.radius,
         riskScore: templateDef.severity === 'High' ? 90 : 65,
         expiresAt: now + lifespanMs,
         isAutonomous: true
       };

       this.newsFeed.unshift({
         id: uuidv4(),
         disruptionId,
         type: templateDef.type,
         title,
         impact: templateDef.severity,
         timestamp: now
       });
       
       this.activeAutonomousDisruptions.push(newDisruption);
    }
    
    if (this.newsFeed.length > 20) this.newsFeed = this.newsFeed.slice(0, 20);
    
    return {
       expiredIds,
       newDisruption
    };
  }
  
  getNewsFeed() {
    return this.newsFeed;
  }
}

module.exports = new IntelligenceEngine();
