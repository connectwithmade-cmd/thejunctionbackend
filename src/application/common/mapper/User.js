import {UserType} from "../UserType.js";

function mapToDomain(data) {
    const domainData = {};

    if (data.googleId) domainData.googleId = data.googleId;
    if (data.name) domainData.name = data.name;
    if (data.firstName) domainData.firstName = data.firstName;
    if (data.lastName) domainData.lastName = data.lastName;
    if (data.userName) domainData.userName = data.userName;
    if (data.email) domainData.email = data.email;
    if (data.phone) domainData.phone = data.phone;
    if (data.dob) domainData.dob = new Date(data.dob); // Ensure it's a Date
    if (data.city) domainData.city = data.city;
    if (data.state) domainData.state = data.state;
    if (data.country) domainData.country = data.country;
    if (data.password) domainData.password = data.password;
    if (data.profilePicture) domainData.profilePicture = data.profilePicture;
    if (data.isVerified !== undefined) domainData.isVerified = Boolean(data.isVerified);
    if (data.isProfileSetup !== undefined) domainData.isProfileSetup = Boolean(data.isProfileSetup);
    if (data.userType) domainData.userType = data.userType;
    if (data.identificationNumber) domainData.identificationNumber = data.identificationNumber;
    if (data.identificationRecord) domainData.identificationRecord = data.identificationRecord;
    if (data.isCompany !== undefined) domainData.isCompany = Boolean(data.isCompany);
    if (data.companyName) domainData.companyName = data.companyName;
    if (data.companyRegistrationNumber) domainData.companyRegistrationNumber = data.companyRegistrationNumber;
    if (data.verificationToken) domainData.verificationToken = data.verificationToken;
    if (data.resetOtpExpiry) domainData.resetOtpExpiry = new Date(data.resetOtpExpiry);
    if (data.isDeleted !== undefined) domainData.isDeleted = Boolean(data.isDeleted);

    return domainData;
}

export function mapToDomainUpdateReq(data) {
    const domain = {};

    if (data.googleId) domain.googleId = data.googleId;
    if (data.name) domain.name = data.name;
    if (data.firstName) domain.firstName = data.firstName;
    if (data.lastName) domain.lastName = data.lastName;
    if (data.userName) domain.userName = data.userName;
    if (data.email) domain.email = data.email;
    if (data.phone) domain.phone = data.phone;
    if (data.dob) domain.dob = new Date(data.dob);
    if (data.city) domain.city = data.city;
    if (data.state) domain.state = data.state;
    if (data.country) domain.country = data.country;
    if (data.profilePicture) domain.profilePicture = data.profilePicture;
    if (data.isProfileSetup !== undefined) domain.isProfileSetup = Boolean(data.isProfileSetup);
    if (data.identificationNumber) domain.identificationNumber = data.identificationNumber;
    if (data.identificationRecord) domain.identificationRecord = data.identificationRecord;
    if (data.companyName) domain.companyName = data.companyName;
    if (data.companyRegistrationNumber) domain.companyRegistrationNumber = data.companyRegistrationNumber;
    if (data.userType) domain.userType = UserType[data.userType];
    if (domain.userType) domain.isProfileSetup = true;
    if (domain.userType === UserType.COMPANY_ACCOUNT) domain.isCompany = true;
    return domain;
}



export function mapToFullDto(data) {
 const dto = {};
    dto.id = data?._id.toString();
    if (data.googleId) dto.googleId = data.googleId;
    if (data.name) dto.name = data.name;
    if (data.firstName) dto.firstName = data.firstName;
    if (data.lastName) dto.lastName = data.lastName;
    if (data.userName) dto.userName = data.userName;
    if (data.email) dto.email = data.email;
    if (data.phone) dto.phone = data.phone;
    if (data.dob) dto.dob = new Date(data.dob);
    if (data.city) dto.city = data.city;
    if (data.state) dto.state = data.state;
    if (data.country) dto.country = data.country;
    if (data.profilePicture) dto.profilePicture = data.profilePicture;
    if (data.isVerified !== undefined) dto.isVerified = Boolean(data.isVerified);
    if (data.isProfileSetup !== undefined) dto.isProfileSetup = Boolean(data.isProfileSetup);
    if (data.userType) dto.userType = data.userType;
    if (data.identificationNumber) dto.identificationNumber = data.identificationNumber;
    if (data.identificationRecord) dto.identificationRecord = data.identificationRecord;
    if (data.isCompany !== undefined) dto.isCompany = Boolean(data.isCompany);
    if (data.companyName) dto.companyName = data.companyName;
    if (data.companyRegistrationNumber) dto.companyRegistrationNumber = data.companyRegistrationNumber;
    if (data.verificationToken) dto.otp = data.verificationToken;
    if (data.isDeleted !== undefined) dto.isDeleted = data.isDeleted;

     dto.myEventIds = data.myEventIds?.map(id => id.toString()) || [];

  dto.friends = data.friends?.map(friend => {
    if (typeof friend === 'object' && friend._id) {
      return mapToDto(friend); // or mapToFullDto(friend) if populated
    }
    return friend.toString();
  }) || [];

  dto.friendRequests = data.friendRequests?.map(req => ({
    from: typeof req.from === 'object' ? mapToDto(req.from) : req.from?.toString(),
    status: req.status,
  })) || [];

  dto.notifications = data.notifications?.map(notification =>
  typeof notification === 'object' && notification._id
    ? mapNotificationToDto(notification)
    : notification.toString()
) || [];


  dto.unreadNotificationCount = data.unreadNotificationCount || 0;


  // Notification Settings Map
  if (data.notificationSettings instanceof Map || typeof data.notificationSettings === 'object') {
    dto.notificationSettings = {};
    for (const [key, value] of Object.entries(data.notificationSettings)) {
      dto.notificationSettings[key] = Boolean(value);
    }
  }

    return dto;
}



export function mapToDto(data) {
    const dto = {};
    dto.id = data?._id.toString();
    //if (data.googleId) dto.googleId = data.googleId;
    if (data.name) dto.name = data.name;
    if (data.firstName) dto.firstName = data.firstName;
    if (data.lastName) dto.lastName = data.lastName;
    if (data.userName) dto.userName = data.userName;
    //if (data.email) dto.email = data.email;
    //if (data.phone) dto.phone = data.phone;
    //if (data.dob) dto.dob = new Date(data.dob);
    if (data.city) dto.city = data.city;
    if (data.state) dto.state = data.state;
    if (data.country) dto.country = data.country;
    if (data.profilePicture) dto.profilePicture = data.profilePicture;
    //if (data.isVerified !== undefined) dto.isVerified = Boolean(data.isVerified);
    //if (data.isProfileSetup !== undefined) dto.isProfileSetup = Boolean(data.isProfileSetup);
    if (data.userType) dto.userType = data.userType;
    //if (data.identificationNumber) dto.identificationNumber = data.identificationNumber;
    //if (data.identificationRecord) dto.identificationRecord = data.identificationRecord;
    if (data.isCompany !== undefined) dto.isCompany = Boolean(data.isCompany);
    if (data.companyName) dto.companyName = data.companyName;
    //if (data.companyRegistrationNumber) dto.companyRegistrationNumber = data.companyRegistrationNumber;
    //if (data.verificationToken) dto.otp = data.verificationToken;
    if (data.isDeleted !== undefined) dto.isDeleted = data.isDeleted;

    return dto;
}

export function mapNotificationToDto(data) {
    const dto = {};
    dto.id = data?._id.toString();
    if (data.message) dto.message = data.message;
    if (data.type) dto.type = data.type;
    if (data.createdAt) dto.createdAt = new Date(data.createdAt);
    if (data.sender) dto.sender = data.sender; // or populate if needed
    // Add other fields specific to Notification schema
    return dto;
}


