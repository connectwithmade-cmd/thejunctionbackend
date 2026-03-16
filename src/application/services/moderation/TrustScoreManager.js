class TrustScoreManager {

 calculateRisk(user){

   if(!user.trustScore) return 0;

   if(user.trustScore > 80) return 0;

   if(user.trustScore > 50) return 0.3;

   if(user.trustScore > 30) return 0.6;

   return 0.85;
 }

}

export default new TrustScoreManager();