// TODO: Replace with your actual Clerk IDs for seamless integration!
export const DEMO_USER_ID = "user_3GPaWW9VmbmkKgl3xbldWF3d4xx"; 
export const DEMO_ADMIN_ID = "user_3GPaWW9VmbmkKgl3xbldWF3d4xx";
export const ANOTHER_USER_CLERK_ID = "user_3GPaWW9VmbmkKgl3xbldWF3d4xx";

// In-Memory Data Store (Flat JSON Structure)
const dataStore: Record<string, any[]> = {
  Order: [
    {
      _id: "ord_id_0",
      userClerkId: DEMO_USER_ID,
      rentCatalogueId: "rental_db_id_0",
      status: "Pending",
      details: "Rented out for a month.",
      createdAt: new Date(Date.now() - 5 * 24*60*60*1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "ord_id_1",
      userClerkId: ANOTHER_USER_CLERK_ID,
      rentCatalogueId: "rental_db_id_1",
      status: "Pending",
      details: "User is negotiating",
      createdAt: new Date(Date.now() - 2 * 24*60*60*1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "ord_id_2",
      userClerkId: DEMO_USER_ID,
      rentCatalogueId: "rental_db_id_2",
      status: "Delivered",
      details: "Long term lease",
      createdAt: new Date(Date.now() - 15 * 24*60*60*1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "ord_id_3",
      userClerkId: ANOTHER_USER_CLERK_ID,
      rentCatalogueId: "rental_db_id_3",
      status: "Pending",
      details: "Awaiting documents",
      createdAt: new Date(Date.now() - 1 * 24*60*60*1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  RentalCatalogue: [
    {
      _id: "rental_db_id_0",
      carOwnerClerkId: DEMO_ADMIN_ID,
      renteeClerkId: DEMO_USER_ID,
      carImageURLs: ["https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=500&q=80"],
      carName: "Tesla",
      carModel: "Model S",
      legalDocumentURLs: [],
      description: "Premium car for rent, well maintained and fully loaded.",
      moreDetails: "Leather seats, self-driving.",
      pricePerMonth: 1000,
      carGPSId: "car_gps_0",
      lastServiceDate: new Date(Date.now() - 100 * 24*60*60*1000).toISOString(),
      carInitLocation: "9.03, 38.75",
      maxRadOfBoundFromInitLoc: 50000,
      isRented: true,
      createdAt: new Date(Date.now() - 100 * 24*60*60*1000).toISOString(),
      updatedAt: new Date(Date.now() - 100 * 24*60*60*1000).toISOString()
    },
    {
      _id: "rental_db_id_1",
      carOwnerClerkId: DEMO_ADMIN_ID,
      renteeClerkId: "",
      carImageURLs: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500&q=80"],
      carName: "BMW",
      carModel: "M5",
      legalDocumentURLs: [],
      description: "High performance sedan.",
      moreDetails: "Sport package.",
      pricePerMonth: 1200,
      carGPSId: "car_gps_1",
      lastServiceDate: new Date(Date.now() - 50 * 24*60*60*1000).toISOString(),
      carInitLocation: "9.03, 38.75",
      maxRadOfBoundFromInitLoc: 50000,
      isRented: false,
      createdAt: new Date(Date.now() - 60 * 24*60*60*1000).toISOString(),
      updatedAt: new Date(Date.now() - 60 * 24*60*60*1000).toISOString()
    },
    {
      _id: "rental_db_id_2",
      carOwnerClerkId: DEMO_ADMIN_ID,
      renteeClerkId: DEMO_USER_ID,
      carImageURLs: ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=500&q=80"],
      carName: "Audi",
      carModel: "RS7",
      legalDocumentURLs: [],
      description: "Luxury and performance.",
      moreDetails: "AWD, turbo V8.",
      pricePerMonth: 1400,
      carGPSId: "car_gps_2",
      lastServiceDate: new Date(Date.now() - 30 * 24*60*60*1000).toISOString(),
      carInitLocation: "9.03, 38.75",
      maxRadOfBoundFromInitLoc: 50000,
      isRented: true,
      createdAt: new Date(Date.now() - 40 * 24*60*60*1000).toISOString(),
      updatedAt: new Date(Date.now() - 40 * 24*60*60*1000).toISOString()
    },
    {
      _id: "rental_db_id_3",
      carOwnerClerkId: DEMO_ADMIN_ID,
      renteeClerkId: "",
      carImageURLs: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=500&q=80"],
      carName: "Mercedes-Benz",
      carModel: "AMG GT",
      legalDocumentURLs: [],
      description: "Ultimate sports car.",
      moreDetails: "RWD, low mileage.",
      pricePerMonth: 2000,
      carGPSId: "car_gps_3",
      lastServiceDate: new Date(Date.now() - 20 * 24*60*60*1000).toISOString(),
      carInitLocation: "9.03, 38.75",
      maxRadOfBoundFromInitLoc: 50000,
      isRented: false,
      createdAt: new Date(Date.now() - 30 * 24*60*60*1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 24*60*60*1000).toISOString()
    },
    {
      _id: "rental_db_id_4",
      carOwnerClerkId: DEMO_ADMIN_ID,
      renteeClerkId: DEMO_USER_ID,
      carImageURLs: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=500"],
      carName: "Porsche",
      carModel: "Taycan",
      legalDocumentURLs: [],
      description: "Electric super sedan.",
      moreDetails: "AWD, fast charging.",
      pricePerMonth: 1800,
      carGPSId: "car_gps_4",
      lastServiceDate: new Date(Date.now() - 10 * 24*60*60*1000).toISOString(),
      carInitLocation: "9.03, 38.75",
      maxRadOfBoundFromInitLoc: 50000,
      isRented: true,
      createdAt: new Date(Date.now() - 20 * 24*60*60*1000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 24*60*60*1000).toISOString()
    }
  ],
  CarGPS: [
    // Commented out per requirements to initialize empty
    // { _id: "gps_pub_id_0", carGPSIMEI: "PUB_00000000", rentalId: "rental_db_id_0", battery: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_pub_id_1", carGPSIMEI: "PUB_00000001", rentalId: "rental_db_id_1", battery: 98, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_pub_id_2", carGPSIMEI: "PUB_00000002", rentalId: "rental_db_id_2", battery: 96, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_pub_id_3", carGPSIMEI: "PUB_00000003", rentalId: "rental_db_id_3", battery: 94, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_pub_id_4", carGPSIMEI: "PUB_00000004", rentalId: "rental_db_id_4", battery: 92, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  CarGPSSecret: [
    // { _id: "gps_sec_id_0", carGPSIMEI: "SEC_00000000", rentalId: "rental_db_id_0", battery: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_sec_id_1", carGPSIMEI: "SEC_00000001", rentalId: "rental_db_id_1", battery: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_sec_id_2", carGPSIMEI: "SEC_00000002", rentalId: "rental_db_id_2", battery: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_sec_id_3", carGPSIMEI: "SEC_00000003", rentalId: "rental_db_id_3", battery: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "gps_sec_id_4", carGPSIMEI: "SEC_00000004", rentalId: "rental_db_id_4", battery: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  Log: [
    // { _id: "log_pub_0", carGPSIMEI: "PUB_00000000", latitude: "9.03", longitude: "38.75", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "log_sec_0", carGPSIMEI: "SEC_00000000", latitude: "9.03", longitude: "38.75", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "log_pub_1", carGPSIMEI: "PUB_00000001", latitude: "9.07", longitude: "38.71", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // { _id: "log_sec_1", carGPSIMEI: "SEC_00000001", latitude: "9.03", longitude: "38.75", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]
};

// Common CRUD Generator for In-Memory Store
const createCRUD = (modelName: string) => {
  return {
    find: (filter: any = {}) => {
      // Basic flat filter support
      return dataStore[modelName].filter((item: any) => {
        let match = true;
        for (const key in filter) {
          if (item[key] !== filter[key]) {
            match = false;
            break;
          }
        }
        return match;
      });
    },
    findById: (id: string) => {
      return dataStore[modelName].find((item: any) => item._id === id) || null;
    },
    create: (data: any) => {
      const newItem = {
        _id: `${modelName.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dataStore[modelName].push(newItem);
      return newItem;
    },
    findByIdAndUpdate: (id: string, updateData: any) => {
      const index = dataStore[modelName].findIndex((item: any) => item._id === id);
      if (index === -1) return null;
      
      const updatedItem = {
        ...dataStore[modelName][index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      dataStore[modelName][index] = updatedItem;
      return updatedItem;
    },
    findByIdAndDelete: (id: string) => {
      const index = dataStore[modelName].findIndex((item: any) => item._id === id);
      if (index === -1) return null;
      const deletedItem = dataStore[modelName][index];
      dataStore[modelName].splice(index, 1);
      return deletedItem;
    }
  };
};

export const mockDB = {
  RentalCatalogue: createCRUD("RentalCatalogue"),
  Order: createCRUD("Order"),
  CarGPS: createCRUD("CarGPS"),
  CarGPSSecret: createCRUD("CarGPSSecret"),
  Log: createCRUD("Log")
};

// Only for backwards compatibility where it returns bare mock arrays in dev mode.
export const getMockData = (model: string) => {
  return dataStore[model] || [];
};
