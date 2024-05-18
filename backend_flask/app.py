from flask import Flask, request,jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import json
from sklearn.ensemble import RandomForestClassifier
app = Flask(__name__)
CORS(app)

TAG = "==========One piece=======>"

#Load the pickle model
#model = pickle.load(open("model.pkl" , "rb"))
model = pickle.load(open("pipelinemodel.pkl", "rb"))

train_data = pd.read_csv("Illness_Training.csv")

drugsmedicine = pd.read_csv("drugsmedicine.csv")

# Remove the 'Unnamed: 133' column if it exists
if 'Unnamed: 133' in train_data.columns:
    train_data.drop(columns=['Unnamed: 133'], inplace=True)

#Extract the features (symptoms) and the target(Illness) from the dataset
#X = Symptoms and Y = Illness 
X_train = train_data.drop(columns=['prognosis'])
y_train = train_data['prognosis']




#@app.route('/' , methods=['POST'])
#def hello_world():
#    data = request.data
#    print(data)
#    return 'Hello , World!'

@app.route('/' , methods=['POST'])
def hello_world():
    data = request.data
    print(TAG , data)
    return jsonify('hello')

@app.route('/predict', methods=['POST'])
def predict_illness():
    # Receive user symptoms data
    user_symptoms = request.data
    print(user_symptoms)
    
    # Create a DataFrame to store user symptoms
    user_symptoms_df = pd.DataFrame(0, index=[0], columns=X_train.columns)

    # Decode the bytes data and load it into a Python dictionary
    user_symptoms_dict = json.loads(user_symptoms.decode('utf-8'))

    # Extract values from the dictionary and store them in a list
    symptom_values = list(user_symptoms_dict.values())

    print(symptom_values)



    
    # Fill in user symptoms as 1 where applicable
    #for symptom , value in user_symptoms.items():
    for symptom in symptom_values:
        if symptom in user_symptoms_df.columns:
            #print(symptom)
            user_symptoms_df.at[0, symptom] = 1
    
    # Perform the prediction using your model
    # Assuming you have a function predict_illness(model, user_symptoms_df)
    # that takes the model and user symptoms DataFrame as input
    
    #predicted_illness = predict_illness(model, user_symptoms_df)
            
    # Print values of each column separately
    for column in user_symptoms_df.columns:
        print(user_symptoms_df[column].values)

    predicted_illness = model.predict(user_symptoms_df)

    print(predicted_illness)
    
    #return jsonify({'predicted_illness': predicted_illness})
    #return jsonify('predicted_illness')
    #return jsonify({'predicted_illness': predicted_illness, 'message': 'success'})
    return jsonify({'predicted_illness': predicted_illness.tolist(), 'message': 'success'})

@app.route('/getmedicine', methods=['GET'])
def get_medicine():
    # Receive disease name from query parameters
    disease_name = request.args.get('disease')

    # Filter the DataFrame for records containing 'heart attack' in the condition column
    records = drugsmedicine[drugsmedicine['condition'].str.contains(disease_name, case=False)]

    # Check if any records match the filter
    if not records.empty:
        # Sort the records by rating and usefulCount in descending order
        sorted_records = records.sort_values(by=['rating', 'usefulCount'], ascending=[False, False])
        
        # Get the record with the highest rating and the most amount of usefulCount
        highest_rating_usefulcount_record = sorted_records.iloc[0]
        print("Record with highest rating and most amount of usefulCount for", disease_name, ":")
        print(highest_rating_usefulcount_record)

        # Convert the record to a dictionary
        record_dict = highest_rating_usefulcount_record.to_dict()

        # Return the medicine information as JSON response
        return jsonify(record_dict)
    else:
        print("No records found for", disease_name)
        return jsonify({"message": "No records found for {}".format(disease_name)})


if __name__ == "__main__":
    app.run(debug=True)