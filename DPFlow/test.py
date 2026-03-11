import torch

print(f"PyTorch Version: {torch.__version__}")


# Check if a CUDA-enabled GPU is available
if torch.cuda.is_available():
    print("CUDA is available! PyTorch can use the GPU.")
    print(f"Number of GPUs: {torch.cuda.device_count()}")
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")
else:
    print("CUDA is not available. PyTorch will use the CPU.")
