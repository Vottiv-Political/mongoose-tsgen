// NOTE: you will need to import these types after your first ever run of the CLI
import mongoose, { UserDocument, UserModel, UserMethods, UserStatics, UserQueries, UserSchema } from "mongoose";
const { Schema, Types } = mongoose;

const UserSchema: UserSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  metadata: Schema.Types.Mixed,
  bestFriend: Types.ObjectId,
  friends: [
    {
      uid: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      nickname: String
    }
  ],
  city: {
    coordinates: {
      type: [Number],
      index: "2dsphere"
    }
  }
});

// NOTE: `this: UserDocument` is required for virtual properties to tell TS the type of `this` value using the "fake this" feature
// you will need to add these in after your first ever run of the CLI
UserSchema.virtual("name").get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// method functions
UserSchema.methods = <UserMethods>{
  isMetadataString() {
    return typeof this.metadata === "string";
  }
};

// static functions
UserSchema.statics = <UserStatics>{
  // friendUids could also use the type `ObjectId[]` here
  async getFriends(friendUids: UserDocument["_id"][]) {
    return await this.aggregate([{ $match: { _id: { $in: friendUids } } }]);
  }
}

// query functions
UserSchema.query = <UserQueries>{
  populateFriends() {
    return this.populate("friends.uid", "firstName lastName");
  }
}

export const User: UserModel = mongoose.model<UserDocument, UserModel>("User", UserSchema);
export default User;
