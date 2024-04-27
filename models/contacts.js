// const fs = require("fs/promises");
// const path = require("path");

// const contactsFilePath = path.join(__dirname, "contacts.json");

// const listContacts = async () => {
//   try {
//     const data = await fs.readFile(contactsFilePath, "utf8");
//     return JSON.parse(data);
//   } catch (error) {
//     throw new Error("Error while reading contacts file");
//   }
// };

// const getContactById = async (contactId) => {
//   try {
//     const data = await fs.readFile(contactsFilePath, "utf8");
//     const contacts = JSON.parse(data);
//     const contact = contacts.find((c) => c.id === contactId);
//     return contact || null;
//   } catch (error) {
//     throw new Error("Error while reading contacts file");
//   }
// };

// const removeContact = async (contactId) => {
//   try {
//     const data = await fs.readFile(contactsFilePath, "utf8");
//     const contacts = JSON.parse(data);

//     const index = contacts.findIndex((contact) => contact.id === contactId);
//     if (index !== -1) {
//       contacts.splice(index, 1);
//       await fs.writeFile(
//         contactsFilePath,
//         JSON.stringify(contacts, null, 2),
//         "utf8"
//       );
//       return true;
//     }
//     return false;
//   } catch (error) {
//     throw new Error("Error while removing contact");
//   }
// };

// const addContact = async (body) => {
//   const { name, email, phone } = body;

//   if (!name || !email || !phone) {
//     throw new Error("missing required name, email, or phone field");
//   }

//   try {
//     const data = await fs.readFile(contactsFilePath, "utf8");
//     const contacts = JSON.parse(data);

//     const id = Date.now().toString();

//     const contactWithId = { id, name, email, phone };

//     contacts.push(contactWithId);

//     await fs.writeFile(
//       contactsFilePath,
//       JSON.stringify(contacts, null, 2),
//       "utf8"
//     );

//     return contactWithId;
//   } catch (error) {
//     throw new Error("Error while adding contact");
//   }
// };

// const updateContact = async (contactId, body) => {
//   const { name, email, phone } = body;

//   try {
//     const data = await fs.readFile(contactsFilePath, "utf8");
//     const contacts = JSON.parse(data);

//     const index = contacts.findIndex((contact) => contact.id === contactId);
//     if (index !== -1) {
//       if (name) contacts[index].name = name;
//       if (email) contacts[index].email = email;
//       if (phone) contacts[index].phone = phone;

//       await fs.writeFile(
//         contactsFilePath,
//         JSON.stringify(contacts, null, 2),
//         "utf8"
//       );

//       return contacts[index];
//     }
//     return null;
//   } catch (error) {
//     throw new Error("Error while updating contact");
//   }
// };

// module.exports = {
//   listContacts,
//   getContactById,
//   removeContact,
//   addContact,
//   updateContact,
// };

const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  favorite: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const Contact = mongoose.model("Contact", contactSchema);

const listContacts = async (userID) => {
  try {
    const contacts = await Contact.find({ owner: userId });
    return contacts;
  } catch (error) {
    throw new Error("Error while fetching contacts");
  }
};

const getContactById = async (contactId) => {
  try {
    const contact = await Contact.findById(contactId);
    return contact;
  } catch (error) {
    throw new Error("Error while fetching contact by ID");
  }
};

const removeContact = async (contactId) => {
  try {
    const result = await Contact.deleteOne({ _id: contactId });
    return result.deletedCount > 0;
  } catch (error) {
    throw new Error("Error while removing contact");
  }
};

const addContact = async (body) => {
  try {
    const newContact = await Contact.create(body);
    return newContact;
  } catch (error) {
    throw new Error("Error while adding contact");
  }
};

const updateContact = async (contactId, body) => {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(contactId, body, {
      new: true,
    });
    return updatedContact;
  } catch (error) {
    throw new Error("Error while updating contact");
  }
};

const updateContactFavorite = async (contactId, favorite) => {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      {
        new: true,
      }
    );
    return updatedContact;
  } catch (error) {
    throw new Error("Error while updating contact favorite status");
  }
};

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateContactFavorite,
};
